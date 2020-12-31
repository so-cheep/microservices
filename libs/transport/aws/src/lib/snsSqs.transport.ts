import {
  MessageMetadata,
  PublishProps,
  PublishResult,
  RpcTimeoutError,
  Transport,
  TransportItem,
} from '@cheep/transport/shared'
import * as AWS from 'aws-sdk'
import { Observable, Subject } from 'rxjs'
import { filter } from 'rxjs/operators'

interface Options {
  moduleName: string
  region: string

  publishExchangeName: string
  newId: () => string

  // Only for testing
  forceTempQueues?: boolean
}

/**
 * Reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html
 *
 */
export class SnsSqsTransport<
  TMetadata extends MessageMetadata,
  TMessage
> implements Transport<TMetadata, TMessage> {
  moduleName: string

  message$: Observable<
    TransportItem<
      TMetadata & { originModule: string },
      TMessage,
      unknown
    >
  >

  private internal$ = new Subject<
    TransportItem<
      TMetadata & { originModule: string },
      TMessage,
      unknown
    >
  >()

  private internalResponse$ = new Subject<
    TransportItem<
      TMetadata & { originModule: string },
      TMessage,
      unknown
    >
  >()

  private rpcResponseQueueName: string

  private topicArn: string
  private queueArn: string
  private queueUrl: string
  private deadLetterQueueArn: string
  private deadLetterQueueUrl: string
  private responseQueueArn: string
  private responseQueueUrl: string

  private sns: AWS.SNS
  private sqs: AWS.SQS
  private isPollingStarted: boolean

  constructor(private options: Options) {
    const { moduleName, newId, region } = options

    this.sns = new AWS.SNS({ region })
    this.sqs = new AWS.SQS({ region })

    // this.sns = new AWS.SNS({ apiVersion: '2010-03-31', region })

    this.moduleName = moduleName
    this.rpcResponseQueueName = `Response-${moduleName}` // -${newId()}

    this.message$ = this.internal$
  }

  async setup() {
    const {
      publishExchangeName,
      forceTempQueues,
      moduleName,
    } = this.options

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
    })

    const queue = await ensureQueueExists({
      sqs: this.sqs,
      queueName: this.moduleName,
      deadLetterQueueArn: deadLetterQueue.queueArn,
      moduleName,
    })

    const responseQueue = await ensureQueueExists({
      sqs: this.sqs,
      queueName: this.rpcResponseQueueName,
      deadLetterQueueArn: deadLetterQueue.queueArn,
      moduleName,
    })

    this.queueArn = queue.queueArn
    this.queueUrl = queue.queueUrl
    this.responseQueueArn = responseQueue.queueArn
    this.responseQueueUrl = responseQueue.queueUrl
    this.deadLetterQueueArn = deadLetterQueue.queueArn
    this.deadLetterQueueUrl = deadLetterQueue.queueUrl
  }

  async publish<TResult, TMeta extends TMetadata = TMetadata>(
    props: PublishProps<TMeta, TMessage>,
  ): Promise<PublishResult<TResult, TMeta> | null> {
    if (!this.sns) {
      return
    }

    const { newId } = this.options

    const { route, message, metadata, rpc } = props

    const correlationId = rpc ? newId() : undefined

    const result = rpc?.enabled
      ? new Promise<PublishResult<TResult, TMeta>>(
          (resolve, reject) => {
            const sub = this.internalResponse$
              .pipe(filter(x => x.correlationId === correlationId))
              .subscribe(x => {
                sub.unsubscribe()
                clearTimeout(timer)

                if (x.isError) {
                  const err: any = x.message
                  reject(new Error(err.message))
                } else {
                  resolve({
                    result: <any>x.message,
                    metadata: <any>x.metadata,
                  })
                }

                x.complete()
              })

            const timer = setTimeout(() => {
              sub.unsubscribe()
              clearTimeout(timer)

              reject(new RpcTimeoutError(<any>props))
            }, rpc.timeout)
          },
        )
      : Promise.resolve(null)

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
        Message: JSON.stringify(message),
        MessageDeduplicationId: newId(),
        MessageGroupId: 'Command',
        MessageAttributes: {
          ...messageAttributes,
          route: {
            DataType: 'String',
            StringValue: route,
          },
        },
      })
      .promise()

    return result
  }

  async listenPatterns(patterns: string[]) {
    await ensureSubscriptionExists({
      sns: this.sns,
      topicArn: this.topicArn,
      queueArn: this.queueArn,
      deadLetterArn: this.deadLetterQueueArn,
      patterns,
    })
  }

  async start() {
    const { newId } = this.options

    this.isPollingStarted = true

    const uniqueInstanceId = newId()

    do {
      try {
        const result = await this.sqs
          .receiveMessage({
            QueueUrl: this.queueUrl,
            WaitTimeSeconds: 0.05,
            MaxNumberOfMessages: 5,
            ReceiveRequestAttemptId: uniqueInstanceId,
          })
          .promise()

        console.log('messages', result)
        if (result.Messages) {
          for (let x of result.Messages) {
            console.log('MESSAGE RECEIVED!', x)

            const body = JSON.parse(x.Body)

            const fullMetadata = Object.fromEntries(
              Object.entries(
                body.MessageAttributes,
              ).map(([key, { Value }]: any) => [key, Value]),
            )

            const { route, correlationId, ...metadata } = fullMetadata
            const message: any = body.message

            this.internal$.next({
              route,
              message,
              metadata,
              correlationId,
              complete: async success => {
                if (!success) {
                  await this.sqs
                    .sendMessage({
                      QueueUrl: this.deadLetterQueueUrl,
                      MessageAttributes: x.MessageAttributes,
                      MessageBody: JSON.stringify(x),
                    })
                    .promise()
                }

                await deleteMessage({
                  sqs: this.sqs,
                  queueUrl: this.queueUrl,
                  messageHandle: x.ReceiptHandle,
                })
              },
              sendReply: async (result, resultMetadata) => {},
              sendErrorReply: async err => {},
            })
          }
        }
      } catch (err) {
        console.warn('err on subscribe', err)
      }

      if (this.responseQueueUrl) {
        try {
          const result = await this.sqs
            .receiveMessage({
              QueueUrl: this.responseQueueUrl,
              WaitTimeSeconds: 0.05,
              MaxNumberOfMessages: 5,
              ReceiveRequestAttemptId: uniqueInstanceId,
            })
            .promise()

          if (result.Messages) {
            result.Messages.forEach(x => {
              const data = JSON.parse(x.Body)

              const route = ''
              const message: any = {}
              const metadata: any = {}
              const correlationId = ''

              this.internalResponse$.next({
                route,
                message,
                metadata,
                correlationId,
                complete: async _ => {
                  await deleteMessage({
                    sqs: this.sqs,
                    queueUrl: this.queueUrl,
                    messageHandle: x.ReceiptHandle,
                  })
                },
                sendReply: async () => {},
                sendErrorReply: async () => {},
              })
            })
          }
        } catch (err) {
          console.warn('err on subscribe', err)
        }
      }
    } while (this.isPollingStarted)

    console.log('finished loop')
  }

  stop() {
    this.isPollingStarted = false
  }

  dispose() {
    this.stop()
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
}) {
  const { sqs, queueName, deadLetterQueueArn, moduleName } = props

  const fullQueueName = `${queueName}.fifo`

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
          FifoQueue: 'true',
          ...(redrivePolicy
            ? { RedrivePolicy: redrivePolicy }
            : null),

          // MessageDeduplicationId: newId(),
          DeduplicationScope: 'messageGroup', // 'messageGroup' | 'queue'
          FifoThroughputLimit: 'perQueue', // 'perQueue' | 'perMessageGroupId'
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
    console.log('creating subscription')
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
