import {
  MessageMetadata,
  PublishProps,
  PublishResult,
  RpcTimeoutError,
  Transport,
  TransportItem,
} from '@cheep/transport'
import * as AWS from 'aws-sdk'
import { MessageAttributeValue } from 'aws-sdk/clients/sqs'
import { Observable, Subject } from 'rxjs'
import { filter } from 'rxjs/operators'

interface Options {
  moduleName: string
  region: string

  publishExchangeName: string
  newId: () => string

  queueWaitTimeInSeconds?: number
  queueMaxNumberOfMessages?: number

  responseQueueWaitTimeInSeconds?: number
  responseQueueMaxNumberOfMessages?: number

  getMessageGroupId?: (route: string) => string
}

/**
 * Reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html
 *
 */
export class SnsSqsTransport<TMetadata extends MessageMetadata>
  implements Transport<TMetadata> {
  moduleName: string

  message$: Observable<
    TransportItem<TMetadata & { originModule: string }>
  >

  private internal$ = new Subject<
    TransportItem<TMetadata & { originModule: string }>
  >()

  private internalResponse$ = new Subject<
    TransportItem<TMetadata & { originModule: string }>
  >()

  private rpcResponseQueueName: string
  private getMessageGroupId: (route: string) => string

  private topicArn: string
  private queueArn: string
  private queueUrl: string
  private deadLetterQueueArn: string
  private deadLetterQueueUrl: string
  private responseQueueUrl: string

  private sns: AWS.SNS
  private sqs: AWS.SQS
  private isPollingStarted: boolean
  private listeningPatterns: Set<string>

  constructor(private options: Options) {
    const { moduleName, newId, region } = options

    this.sns = new AWS.SNS({ region })
    this.sqs = new AWS.SQS({ region })

    this.listeningPatterns = new Set()

    this.moduleName = moduleName
    this.rpcResponseQueueName = `Response-${moduleName}-${newId()}`

    this.message$ = this.internal$
  }

  async init() {
    const {
      publishExchangeName,
      moduleName,
      getMessageGroupId,
    } = this.options

    this.getMessageGroupId =
      getMessageGroupId ??
      (x => {
        if (!x) {
          return undefined
        }

        return x.split('.')[0] ?? undefined
      })

    this.topicArn = await ensureTopicExists({
      sns: this.sns,
      publishExchangeName,
      moduleName,
    })

    const deadLetterQueue = await ensureQueueExists({
      sqs: this.sqs,
      queueName: `DL-${this.moduleName}`,
      deadLetterQueueArn: null,
      moduleName,
      isFifo: true,
    })

    const queue = await ensureQueueExists({
      sqs: this.sqs,
      queueName: this.moduleName,
      deadLetterQueueArn: deadLetterQueue.queueArn,
      moduleName,
      isFifo: true,
    })

    const responseQueue = await ensureQueueExists({
      sqs: this.sqs,
      queueName: this.rpcResponseQueueName,
      deadLetterQueueArn: null,
      moduleName,
      isFifo: false,
    })

    this.queueArn = queue.queueArn
    this.queueUrl = queue.queueUrl
    this.responseQueueUrl = responseQueue.queueUrl
    this.deadLetterQueueArn = deadLetterQueue.queueArn
    this.deadLetterQueueUrl = deadLetterQueue.queueUrl
  }

  async listenPatterns(patterns: string[]) {
    await ensureSubscriptionExists({
      sns: this.sns,
      topicArn: this.topicArn,
      queueArn: this.queueArn,
      deadLetterArn: this.deadLetterQueueArn,
      patterns,
    })

    patterns.forEach(x => this.listeningPatterns.add(x))
  }

  start() {
    const {
      newId,
      queueWaitTimeInSeconds = 0.1,
      queueMaxNumberOfMessages = 5,
      responseQueueWaitTimeInSeconds = 10,
      responseQueueMaxNumberOfMessages = 1,
    } = this.options

    this.isPollingStarted = true

    this.fetchAndProcessData(
      this.queueUrl,
      newId(),
      newId,
      queueWaitTimeInSeconds,
      queueMaxNumberOfMessages,
    )

    if (this.responseQueueUrl) {
      this.fetchAndProcessResponseData(
        this.responseQueueUrl,
        newId(),
        newId,
        responseQueueWaitTimeInSeconds,
        responseQueueMaxNumberOfMessages,
      )
    }
  }

  stop() {
    this.isPollingStarted = false
  }

  async publish<TResult, TMeta extends TMetadata = TMetadata>(
    props: PublishProps<TMeta>,
  ): Promise<PublishResult<TMeta> | null> {
    if (!this.sns) {
      return
    }

    const { newId } = this.options

    const { route, message, metadata, rpc } = props

    const correlationId = rpc?.enabled ? newId() : undefined

    const result = rpc?.enabled
      ? new Promise<PublishResult<TResult>>((resolve, reject) => {
          const sub = this.internalResponse$
            .pipe(filter(x => x.correlationId === correlationId))
            .subscribe(x => {
              sub.unsubscribe()
              clearTimeout(timer)

              if (x.metadata.isError) {
                const err: any = x.message
                reject(new Error(err.message))
              } else {
                resolve({
                  result: x.message,
                  metadata: <any>x.metadata,
                })
              }
            })

          const timer = setTimeout(() => {
            sub.unsubscribe()
            clearTimeout(timer)

            reject(new RpcTimeoutError(<any>props))
          }, rpc.timeout)
        })
      : Promise.resolve(null)

    await this.sendMessageToSns({
      route,
      message,
      metadata,
      messageGroupId: this.getMessageGroupId(route),
      correlationId,
      replyToQueueUrl: this.responseQueueUrl,
    })

    return result
  }

  async dispose() {
    this.stop()

    await deleteQueue({
      sqs: this.sqs,
      queueUrl: this.responseQueueUrl,
    })
  }

  private async sendMessageToSns(props: {
    route: string
    message: string
    metadata: TMetadata
    messageGroupId: string
    correlationId?: string
    replyToQueueUrl?: string
  }) {
    const { newId } = this.options

    const {
      route,
      message,
      metadata,
      correlationId,
      messageGroupId,
      replyToQueueUrl,
    } = props

    const messageAttributes = Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [
        key,
        {
          DataType: 'String',
          StringValue: value,
        },
      ]),
    )

    await this.sns
      .publish({
        TopicArn: this.topicArn,
        Message: message,
        MessageDeduplicationId: newId(),
        MessageGroupId: messageGroupId,
        MessageAttributes: {
          ...messageAttributes,
          route: {
            DataType: 'String',
            StringValue: route,
          },
          ...(correlationId
            ? {
                correlationId: {
                  DataType: 'String',
                  StringValue: correlationId,
                },
              }
            : null),
          ...(replyToQueueUrl
            ? {
                replyToQueue: {
                  DataType: 'String',
                  StringValue: replyToQueueUrl,
                },
              }
            : null),
        },
      })
      .promise()
  }

  private async sendMessageToSqs(props: {
    queueUrl: string
    message: string
    metadata: TMetadata
    messageGroupId: string
    correlationId: string
  }) {
    const {
      queueUrl,
      message,
      metadata,
      correlationId,
      messageGroupId,
    } = props

    const messageAttributes = Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [
        key,
        <MessageAttributeValue>{
          DataType: 'String',
          StringValue: value,
        },
      ]),
    )

    await this.sqs
      .sendMessage({
        QueueUrl: queueUrl,
        MessageBody: message,
        MessageAttributes: {
          ...messageAttributes,
          correlationId: {
            DataType: 'String',
            StringValue: correlationId,
          },
        },
      })
      .promise()
  }

  private async fetchAndProcessData(
    queueUrl: string,
    requestAttemptId: string,
    newId: () => string,
    queueWaitTimeInSeconds: number,
    queueMaxNumberOfMessages: number,
  ) {
    let keepOldAttemptId: boolean

    try {
      const messages = await this.fetchSqsMessages({
        queueUrl,
        requestAttemptId,
        waitTimeInSeconds: queueWaitTimeInSeconds,
        maxNumberOfMessages: queueMaxNumberOfMessages,
        isSnsMessage: true,
      })

      messages.forEach(async x => {
        if (
          shouldRouteAutoComplete(x.route, this.listeningPatterns)
        ) {
          await deleteMessage({
            sqs: this.sqs,
            queueUrl: this.queueUrl,
            messageHandle: x.sqs.ReceiptHandle,
          })
          return
        }

        this.internal$.next({
          route: x.route,
          message: x.message,
          metadata: x.metadata,
          correlationId: x.correlationId,
          complete: async success => {
            if (!success) {
              await this.sqs
                .sendMessage({
                  QueueUrl: this.deadLetterQueueUrl,
                  MessageAttributes: x.sqs.MessageAttributes,
                  MessageBody: x.sqs.Body,
                })
                .promise()
            }

            await deleteMessage({
              sqs: this.sqs,
              queueUrl: this.queueUrl,
              messageHandle: x.sqs.ReceiptHandle,
            })
          },
          sendReply: async (result, resultMetadata) => {
            this.sendMessageToSqs({
              queueUrl: x.replyToQueue,
              correlationId: x.correlationId,
              message: result,
              metadata: {
                ...x.metadata,
                ...resultMetadata,
              },
              messageGroupId: newId(),
            })
          },
          sendErrorReply: async err => {
            this.sendMessageToSqs({
              queueUrl: x.replyToQueue,
              correlationId: x.correlationId,
              message: JSON.stringify({
                name: err.name,
                message: err.message,
                stack: err.stack,
              }),
              metadata: {
                ...x.metadata,
                isError: true,
              },
              messageGroupId: newId(),
            })
          },
        })
      })
    } catch (err) {
      console.warn('err on subscribe', this.queueUrl, err)

      keepOldAttemptId = true
    }

    if (this.isPollingStarted) {
      await this.fetchAndProcessData(
        queueUrl,
        keepOldAttemptId ? requestAttemptId : newId(),
        newId,
        queueWaitTimeInSeconds,
        queueMaxNumberOfMessages,
      )
    }
  }

  private async fetchAndProcessResponseData(
    queueUrl: string,
    requestAttemptId: string,
    newId: () => string,
    responseQueueWaitTimeInSeconds: number,
    responseQueueMaxNumberOfMessages: number,
  ) {
    let keepOldAttemptId: boolean

    try {
      const responseMessages = await this.fetchSqsMessages({
        queueUrl,
        requestAttemptId,
        waitTimeInSeconds: responseQueueWaitTimeInSeconds,
        maxNumberOfMessages: responseQueueMaxNumberOfMessages,
        isSnsMessage: false,
      })

      responseMessages.forEach(async x => {
        try {
          this.internalResponse$.next({
            route: x.route,
            message: x.message,
            metadata: x.metadata,
            correlationId: x.correlationId,
            complete: async _ => {},
            sendReply: async () => {},
            sendErrorReply: async () => {},
          })

          await deleteMessage({
            sqs: this.sqs,
            queueUrl,
            messageHandle: x.sqs.ReceiptHandle,
          })
        } catch (err) {
          console.warn('response err', err)
        }
      })
    } catch (err) {
      console.warn('err on subscribe', err)

      keepOldAttemptId = true
    }

    if (this.isPollingStarted) {
      this.fetchAndProcessResponseData(
        queueUrl,
        keepOldAttemptId ? requestAttemptId : newId(),
        newId,
        responseQueueWaitTimeInSeconds,
        responseQueueMaxNumberOfMessages,
      )
    }
  }

  private async fetchSqsMessages(props: {
    queueUrl: string
    requestAttemptId: string
    waitTimeInSeconds: number
    maxNumberOfMessages: number
    isSnsMessage: boolean
  }) {
    const {
      queueUrl,
      requestAttemptId,
      waitTimeInSeconds,
      maxNumberOfMessages,
      isSnsMessage,
    } = props

    const result = await this.sqs
      .receiveMessage({
        QueueUrl: queueUrl,
        WaitTimeSeconds: waitTimeInSeconds,
        MaxNumberOfMessages: maxNumberOfMessages,
        ReceiveRequestAttemptId: requestAttemptId,
        MessageAttributeNames: isSnsMessage ? undefined : ['All'],
      })
      .promise()

    return (result.Messages || []).map(x => {
      const body = isSnsMessage ? JSON.parse(x.Body) : x.Body
      const message = isSnsMessage ? body.Message : body

      const fullMetadata = Object.fromEntries(
        !isSnsMessage
          ? Object.entries(
              x.MessageAttributes,
            ).map(([key, { StringValue }]: any) => [key, StringValue])
          : Object.entries(
              body.MessageAttributes,
            ).map(([key, { Value }]: any) => [key, Value]),
      )

      const {
        route,
        correlationId,
        replyToQueue,
        ...metadata
      } = fullMetadata

      return {
        route,
        message,
        metadata,
        correlationId,
        replyToQueue,

        sqs: {
          ReceiptHandle: x.ReceiptHandle,
          MessageAttributes: x.MessageAttributes,
          Body: x.Body,
        },
      }
    })
  }
}

async function ensureTopicExists(props: {
  sns: AWS.SNS
  publishExchangeName: string
  moduleName: string
}) {
  const { sns, publishExchangeName, moduleName } = props

  const topicName = `${publishExchangeName}.fifo`

  const topics = await sns.listTopics({}).promise()
  const publishTopicArn = topics?.Topics?.filter(x =>
    x.TopicArn?.endsWith(topicName),
  ).map(x => x.TopicArn)[0]
  // topics.Topics[0].

  if (publishTopicArn) {
    return publishTopicArn
  }

  const topic = await sns
    .createTopic({
      Name: topicName,
      Attributes: {
        DisplayName: publishExchangeName,
        FifoTopic: 'true',
        // ContentBasedDeduplication: 'false'
        // Policy: '',
      },
      Tags: [
        {
          Key: 'module',
          Value: moduleName,
        },
      ],
    })
    .promise()

  return topic.TopicArn
}

async function ensureQueueExists(props: {
  sqs: AWS.SQS
  queueName: string
  deadLetterQueueArn: string | null
  moduleName: string
  isFifo: boolean
}) {
  const {
    sqs,
    queueName,
    deadLetterQueueArn,
    moduleName,
    isFifo,
  } = props

  const fullQueueName = isFifo ? `${queueName}.fifo` : queueName

  const queues = await sqs
    .listQueues({
      QueueNamePrefix: fullQueueName,
      MaxResults: 1,
    })
    .promise()

  let queueUrl = queues?.QueueUrls && queues?.QueueUrls[0]
  if (!queueUrl) {
    const redrivePolicy = deadLetterQueueArn
      ? JSON.stringify({
          deadLetterTargetArn: deadLetterQueueArn,
          maxReceiveCount: 3,
        })
      : null

    const queue = await sqs
      .createQueue({
        QueueName: fullQueueName,
        tags: {
          module: moduleName,
        },
        Attributes: {
          ...(redrivePolicy
            ? { RedrivePolicy: redrivePolicy }
            : null),

          ...(isFifo
            ? {
                FifoQueue: 'true',
                FifoThroughputLimit: 'perQueue', // 'perQueue' | 'perMessageGroupId'
                DeduplicationScope: 'messageGroup', // 'messageGroup' | 'queue'
              }
            : null),
        },
      })
      .promise()

    queueUrl = queue.QueueUrl
  }

  const result = await sqs
    .getQueueAttributes({
      QueueUrl: queueUrl,
      AttributeNames: ['QueueArn'],
    })
    .promise()

  return {
    queueUrl,
    queueArn: result.Attributes.QueueArn,
  }
}

async function ensureSubscriptionExists(props: {
  sns: AWS.SNS
  topicArn: string
  queueArn: string
  deadLetterArn: string
  patterns: string[]
}) {
  const { sns, topicArn, queueArn, deadLetterArn, patterns } = props

  const subscriptions = await sns
    .listSubscriptionsByTopic({ TopicArn: topicArn })
    .promise()

  const subscription = subscriptions.Subscriptions.find(
    x => x.Endpoint === queueArn,
  )

  let subscriptionArn = subscription?.SubscriptionArn
  if (subscription) {
    const attr = await sns
      .getSubscriptionAttributes({
        SubscriptionArn: subscriptionArn,
      })
      .promise()

    const oldPolicy = attr.Attributes.FilterPolicy
      ? JSON.parse(attr.Attributes.FilterPolicy)
      : {}

    const routeFilters = [...(oldPolicy?.route ?? [])]

    const applyPatterns = patterns.filter(
      prefix => !routeFilters.some(x => x.prefix === prefix),
    )

    if (applyPatterns.length) {
      await sns
        .setSubscriptionAttributes({
          SubscriptionArn: subscriptionArn,
          AttributeName: 'FilterPolicy',
          AttributeValue: JSON.stringify({
            route: routeFilters.concat(
              applyPatterns.map(prefix => ({ prefix })),
            ),
          }),
        })
        .promise()
    }
  } else {
    const result = await sns
      .subscribe({
        Protocol: 'sqs',
        TopicArn: topicArn,
        Endpoint: queueArn,
        ReturnSubscriptionArn: true,
        Attributes: {
          FilterPolicy: JSON.stringify({
            route: patterns.map(prefix => ({ prefix })),
          }),
          RedrivePolicy: JSON.stringify({
            deadLetterTargetArn: deadLetterArn,
          }),
        },
      })
      .promise()

    subscriptionArn = result.SubscriptionArn
  }

  return subscriptionArn
}

async function deleteMessage(props: {
  sqs: AWS.SQS
  queueUrl: string
  messageHandle: string
}) {
  const { sqs, queueUrl, messageHandle } = props

  await sqs
    .deleteMessage({
      QueueUrl: queueUrl,
      ReceiptHandle: messageHandle,
    })
    .promise()
}

async function deleteQueue(props: {
  sqs: AWS.SQS
  queueUrl: string
}) {
  const { sqs, queueUrl } = props

  await sqs
    .deleteQueue({
      QueueUrl: queueUrl,
    })
    .promise()
}

function shouldRouteAutoComplete(
  route: string,
  listeningPatterns: Set<string>,
) {
  return !listeningPatterns.has(route)
}
