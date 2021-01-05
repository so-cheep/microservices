import {
  ExecuteProps,
  FireAndForgetHandler,
  MessageMetadata,
  PublishProps,
  RouteHandler,
  RpcTimeoutError,
  Transport,
} from '@cheep/transport'
import * as AWS from 'aws-sdk'

interface TransportMessage {
  route: string
  message: string
  metadata: MessageMetadata

  correlationId: string
  replyToQueue: string

  // lambda specific
  receiptHandle: string
}

function normalizeSnsMessage(
  sqsMessage: AWS.SQS.Message,
): TransportMessage {
  const body = JSON.parse(sqsMessage.Body)
  const message = body.Message

  const fullMetadata = Object.fromEntries(
    Object.entries(
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

    receiptHandle: sqsMessage.ReceiptHandle,
  }
}

function normalizeSqsMessage(
  sqsMessage: AWS.SQS.Message,
): TransportMessage {
  const body = sqsMessage.Body
  const message = body

  const fullMetadata = Object.fromEntries(
    Object.entries(
      sqsMessage.MessageAttributes,
    ).map(([key, { StringValue }]: any) => [key, StringValue]),
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

    receiptHandle: sqsMessage.ReceiptHandle,
  }
}

let sqsCache: AWS.SQS

function getSqs() {
  return sqsCache || (sqsCache = new AWS.SQS())
}

let snsCache: AWS.SNS

function getSns() {
  return snsCache || (snsCache = new AWS.SNS())
}

export type ListenResponseCallback = (
  items: TransportMessage[],
) => boolean

export async function processMessages(
  deadLetterQueueUrl: string,
  sqsMessages: AWS.SQS.Message[],
  action: (x: TransportMessage) => Promise<void>,
) {
  const messages = sqsMessages.map(normalizeSnsMessage)

  const successMessages: TransportMessage[] = []
  const errorMessages: [TransportMessage, Error][] = []

  for (const message of messages) {
    try {
      await action(message)

      successMessages.push(message)
    } catch (err) {
      console.error('LAMBDA_TRANSPORT_PROCESSING_ERROR', err)
      errorMessages.push([message, err])
    }
  }

  /**
   * Don't ack any messages if all of them passed successfully
   * Lambda will ack them for us
   */
  if (errorMessages.length) {
    // move error messages to the DLQ and let this process finish successfully
    const sqs = getSqs()

    await sendMessagesToDLQ({
      sqs,
      queueUrl: deadLetterQueueUrl,
      messages: errorMessages,
    })
  }
}

export function listenResponseQueue(props: {
  responseQueueUrl: string
  newId: () => string
  shouldContinue: () => boolean
  cb: (messages: TransportMessage[]) => void
}) {
  const { responseQueueUrl, newId, shouldContinue, cb } = props

  listenQueue({
    queueUrl: responseQueueUrl,
    maxNumberOfMessages: 1,
    waitTimeInSeconds: 1,
    isSnsMessage: false,
    requestAttemptId: newId(),
    newId,
    shouldContinue,
    cb,
  })
}

async function sendMessageToSns<TMetadata>(props: {
  sns: AWS.SNS
  topicArn: string
  route: string
  message: string
  metadata: TMetadata
  messageGroupId: string
  deduplicationId: string
  correlationId?: string
  replyToQueueUrl?: string
}) {
  const {
    sns,
    topicArn,
    route,
    message,
    metadata,
    correlationId,
    deduplicationId,
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

  await sns
    .publish({
      TopicArn: topicArn,
      Message: message,
      MessageDeduplicationId: deduplicationId,
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

async function sendMessageToSqs<TMetadata>(props: {
  sqs: AWS.SQS
  queueUrl: string
  message: string
  metadata: TMetadata
  correlationId: string
}) {
  const { sqs, queueUrl, message, metadata, correlationId } = props

  const messageAttributes = Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      {
        DataType: 'String',
        StringValue: value,
      },
    ]),
  )

  await sqs
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

async function listenQueue(props: {
  queueUrl: string
  requestAttemptId: string
  waitTimeInSeconds: number
  maxNumberOfMessages: number
  isSnsMessage: boolean
  newId: () => string
  shouldContinue: () => boolean
  cb: (messages: TransportMessage[]) => void
}) {
  const {
    queueUrl,
    requestAttemptId,
    waitTimeInSeconds,
    maxNumberOfMessages,
    isSnsMessage,
    newId,
    shouldContinue,
    cb,
  } = props

  const fn = async (attemptId: string) => {
    let keepSameAttemptId: boolean

    try {
      const result = await this.sqs
        .receiveMessage({
          QueueUrl: queueUrl,
          WaitTimeSeconds: waitTimeInSeconds,
          MaxNumberOfMessages: maxNumberOfMessages,
          ReceiveRequestAttemptId: attemptId,
          MessageAttributeNames: isSnsMessage ? undefined : ['All'],
        })
        .promise()

      const messages: TransportMessage[] = (
        result.Messages || []
      ).map(isSnsMessage ? normalizeSnsMessage : normalizeSqsMessage)

      if (messages.length) {
        try {
          cb(messages)
        } catch {}
      }
    } catch (err) {
      // We need to keep same attemptId if there is a network error
      // to receive same set of items
      keepSameAttemptId = true
    }

    if (shouldContinue()) {
      fn(keepSameAttemptId ? attemptId : newId())
    }
  }

  fn(requestAttemptId)
}

async function batchDeleteMessages(props: {
  sqs: AWS.SQS
  queueUrl: string
  receiptHandles: string[]
}) {
  const { sqs, queueUrl, receiptHandles } = props

  await sqs
    .deleteMessageBatch({
      QueueUrl: queueUrl,
      Entries: receiptHandles.map((x, i) => ({
        Id: i.toString(),
        ReceiptHandle: x,
      })),
    })
    .promise()
}

async function sendMessagesToDLQ(props: {
  sqs: AWS.SQS
  queueUrl: string
  messages: [TransportMessage, Error][]
}) {
  const { sqs, queueUrl, messages } = props

  await sqs
    .sendMessageBatch({
      QueueUrl: queueUrl,
      Entries: messages.map((x, i) => ({
        Id: i.toString(),
        MessageBody: x[0].message,
        // TODO: store x[1] Error as well somewhere in attributes
        // TODO: store metadata in attributes
        // MessageAttributes: x.Attributes
      })),
    })
    .promise()
}

export class LambdaTransport<TMetadata extends MessageMetadata>
  implements Transport<TMetadata> {
  moduleName?: string

  private routeHandlers = new Map<string, RouteHandler>()
  private onEveryAction?: FireAndForgetHandler
  private listenCallbacks: ListenResponseCallback[] = []

  constructor(
    private options: {
      initialMessages: AWS.SQS.Message[]
      topicArn: string
      responseQueueUrl: string
      deadLetterQueueUrl: string
      utils: {
        jsonEncode: (s: unknown) => string
        jsonDecode: (s: string) => unknown
        newId: () => string
        getMessageGroup: (route: string) => string
      }

      defaultRpcTimeout?: number
    },
  ) {}

  async init() {}

  async start() {
    this.processMessages(this.options.initialMessages)
  }

  async stop() {}

  async publish<TMeta extends TMetadata = TMetadata>(
    props: PublishProps<TMeta>,
  ) {
    const { topicArn, utils } = this.options
    const { route, message, metadata = {} } = props

    const sns = getSns()

    await sendMessageToSns({
      sns,
      topicArn,
      route,
      message: utils.jsonEncode(message),
      metadata,
      deduplicationId: utils.newId(),
      messageGroupId: utils.getMessageGroup(route),
    })
  }

  async execute<TMeta extends TMetadata = TMetadata>(
    props: ExecuteProps<TMeta>,
  ): Promise<unknown> {
    const {
      topicArn,
      utils,
      responseQueueUrl,
      defaultRpcTimeout = 1000,
    } = this.options
    const { route, message, metadata = {}, rpcTimeout } = props

    const sns = getSns()

    let correlationId = utils.newId()

    await sendMessageToSns({
      sns,
      topicArn,
      route,
      message: utils.jsonEncode(message),
      metadata,
      deduplicationId: utils.newId(),
      replyToQueueUrl: responseQueueUrl,
      correlationId,
      messageGroupId: utils.getMessageGroup(route),
    })

    const rpcCallTimeout = rpcTimeout ?? defaultRpcTimeout

    return new Promise((resolve, reject) => {
      try {
        const cb = items => {
          const item = items.find(
            x => x.correlationId === correlationId,
          )

          if (!item) {
            return false
          }

          clearTimeout(timer)

          const result = utils.jsonDecode(item.message)

          resolve(result)

          return true
        }

        const unsubscribe = this.startListenResponses(cb)

        const timer = setTimeout(() => {
          unsubscribe()
          clearTimeout(timer)

          reject(new RpcTimeoutError(props))
        }, rpcCallTimeout)
      } catch (err) {
        reject(err)
      }
    })
  }

  on(route: string, action: RouteHandler<TMetadata>) {
    this.routeHandlers.set(route, action)
  }

  onEvery(action: FireAndForgetHandler<TMetadata>) {
    this.onEveryAction = action
  }

  async dispose() {
    this.routeHandlers.clear()
    this.listenCallbacks = []
  }

  private processMessages(initialMessages: AWS.SQS.Message[]) {
    const { deadLetterQueueUrl, utils } = this.options

    processMessages(deadLetterQueueUrl, initialMessages, async x => {
      const message = utils.jsonDecode(x.message)

      if (this.onEveryAction) {
        new Promise((resolve, reject) => {
          try {
            this.onEveryAction({
              route: x.route,
              message,
              metadata: x.metadata,
            })

            resolve(true)
          } catch (err) {
            reject(err)
          }
        }).catch(err => {})
      }

      const routeHandler = this.routeHandlers.get(x.route)
      if (routeHandler) {
        const result = await routeHandler({
          route: x.route,
          message,
          metadata: x.metadata,
        })

        if (x.replyToQueue) {
          /**
           * Send reply only when something is returned
           */

          const sqs = getSqs()

          await sendMessageToSqs({
            sqs,
            queueUrl: x.replyToQueue,
            metadata: x.metadata,
            correlationId: x.correlationId,
            message: utils.jsonEncode(result ?? ''),
          })
        }
      }
    })
  }

  private startListenResponses(cb: ListenResponseCallback) {
    this.listenCallbacks.push(cb)

    if (this.listenCallbacks.length === 1) {
      const { responseQueueUrl, utils } = this.options

      listenResponseQueue({
        responseQueueUrl,
        newId: utils.newId,
        shouldContinue: () => this.listenCallbacks.length > 0,
        cb: items => {
          const finishedCallbackIndexes = this.listenCallbacks
            .map((cb, i) => (cb(items) ? i : null))
            .filter(x => x !== null)

          this.listenCallbacks = this.listenCallbacks.filter(
            (_, i) => !finishedCallbackIndexes.includes(i),
          )
        },
      })
    }

    return () => {
      this.listenCallbacks = this.listenCallbacks.filter(
        x => x !== cb,
      )
    }
  }
}

// /**
//  * Reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html
//  *
//  */
// export class LambdaTransport<TMetadata extends MessageMetadata>
//   implements Transport<TMetadata> {
//   moduleName: string

//   message$: Observable<
//     TransportItem<TMetadata & { originModule: string }>
//   >

//   private internal$ = new Subject<
//     TransportItem<TMetadata & { originModule: string }>
//   >()

//   private internalResponse$ = new Subject<
//     TransportItem<TMetadata & { originModule: string }>
//   >()

//   private rpcResponseQueueName: string
//   private getMessageGroupId: (route: string) => string

//   private topicArn: string
//   private queueArn: string
//   private queueUrl: string
//   private deadLetterQueueArn: string
//   private deadLetterQueueUrl: string
//   private responseQueueUrl: string

//   private sns: AWS.SNS
//   private sqs: AWS.SQS
//   private isPollingStarted: boolean
//   private listeningPatterns: Set<string>

//   constructor(private options: Options) {
//     const { moduleName, newId, region } = options

//     this.sns = new AWS.SNS({ region })
//     this.sqs = new AWS.SQS({ region })

//     this.listeningPatterns = new Set()

//     this.moduleName = moduleName
//     this.rpcResponseQueueName = `Response-${moduleName}-${newId()}`

//     this.message$ = this.internal$
//   }

//   async init() {
//     const {
//       publishExchangeName,
//       moduleName,
//       getMessageGroupId,
//       manualConfiguration,
//     } = this.options

//     this.getMessageGroupId =
//       getMessageGroupId ??
//       (x => {
//         if (!x) {
//           return undefined
//         }

//         return x.split('.')[0] ?? undefined
//       })

//     if (disableResourceCheck) {
//       this.topicArn = manualConfiguration.topicArn
//       this.queueUrl = manualConfiguration.queueUrl
//       this.responseQueueUrl = manualConfiguration.responseQueueUrl
//       this.deadLetterQueueUrl = manualConfiguration.deadLetterQueueUrl
//     } else {
//       this.topicArn = await ensureTopicExists({
//         sns: this.sns,
//         publishExchangeName,
//         moduleName,
//       })

//       const deadLetterQueue = await ensureQueueExists({
//         sqs: this.sqs,
//         queueName: `DL-${this.moduleName}`,
//         deadLetterQueueArn: null,
//         moduleName,
//         isFifo: true,
//       })

//       const queue = await ensureQueueExists({
//         sqs: this.sqs,
//         queueName: this.moduleName,
//         deadLetterQueueArn: deadLetterQueue.queueArn,
//         moduleName,
//         isFifo: true,
//       })

//       const responseQueue = await ensureQueueExists({
//         sqs: this.sqs,
//         queueName: this.rpcResponseQueueName,
//         deadLetterQueueArn: null,
//         moduleName,
//         isFifo: false,
//       })

//       this.queueArn = queue.queueArn
//       this.queueUrl = queue.queueUrl
//       this.responseQueueUrl = responseQueue.queueUrl
//       this.deadLetterQueueArn = deadLetterQueue.queueArn
//       this.deadLetterQueueUrl = deadLetterQueue.queueUrl
//     }
//   }

//   async listenPatterns(patterns: string[]) {
//     if (!this.options.disableResourceCheck) {
//       await ensureSubscriptionExists({
//         sns: this.sns,
//         topicArn: this.topicArn,
//         queueArn: this.queueArn,
//         deadLetterArn: this.deadLetterQueueArn,
//         patterns,
//       })
//     }

//     patterns.forEach(x => this.listeningPatterns.add(x))
//   }

//   start() {
//     const {
//       newId,
//       queueWaitTimeInSeconds = 0.1,
//       queueMaxNumberOfMessages = 5,
//       responseQueueWaitTimeInSeconds = 10,
//       responseQueueMaxNumberOfMessages = 1,
//     } = this.options

//     this.isPollingStarted = true

//     this.fetchAndProcessData(
//       this.queueUrl,
//       newId(),
//       newId,
//       queueWaitTimeInSeconds,
//       queueMaxNumberOfMessages,
//     )

//     if (this.responseQueueUrl) {
//       this.fetchAndProcessResponseData(
//         this.responseQueueUrl,
//         newId(),
//         newId,
//         responseQueueWaitTimeInSeconds,
//         responseQueueMaxNumberOfMessages,
//       )
//     }
//   }

//   stop() {
//     this.isPollingStarted = false
//   }

//   async publish<TResult, TMeta extends TMetadata = TMetadata>(
//     props: PublishProps<TMeta>,
//   ): Promise<PublishResult<TMeta> | null> {
//     if (!this.sns) {
//       return
//     }

//     const { newId } = this.options

//     const { route, message, metadata, rpc } = props

//     const correlationId = rpc?.enabled ? newId() : undefined

//     const result = rpc?.enabled
//       ? new Promise<PublishResult<TResult>>((resolve, reject) => {
//           const sub = this.internalResponse$
//             .pipe(filter(x => x.correlationId === correlationId))
//             .subscribe(x => {
//               sub.unsubscribe()
//               clearTimeout(timer)

//               if (x.metadata.isError) {
//                 const err: any = x.message
//                 reject(new Error(err.message))
//               } else {
//                 resolve({
//                   result: x.message,
//                   metadata: <any>x.metadata,
//                 })
//               }
//             })

//           const timer = setTimeout(() => {
//             sub.unsubscribe()
//             clearTimeout(timer)

//             reject(new RpcTimeoutError(<any>props))
//           }, rpc.timeout)
//         })
//       : Promise.resolve(null)

//     await this.sendMessageToSns({
//       route,
//       message,
//       metadata,
//       messageGroupId: this.getMessageGroupId(route),
//       correlationId,
//       replyToQueueUrl: this.responseQueueUrl,
//     })

//     return result
//   }

//   async dispose() {
//     this.stop()

//     await deleteQueue({
//       sqs: this.sqs,
//       queueUrl: this.responseQueueUrl,
//     })
//   }

//   private async sendMessageToSns(props: {
//     route: string
//     message: string
//     metadata: TMetadata
//     messageGroupId: string
//     correlationId?: string
//     replyToQueueUrl?: string
//   }) {
//     const { newId } = this.options

//     const {
//       route,
//       message,
//       metadata,
//       correlationId,
//       messageGroupId,
//       replyToQueueUrl,
//     } = props

//     const messageAttributes = Object.fromEntries(
//       Object.entries(metadata).map(([key, value]) => [
//         key,
//         {
//           DataType: 'String',
//           StringValue: value,
//         },
//       ]),
//     )

//     await this.sns
//       .publish({
//         TopicArn: this.topicArn,
//         Message: message,
//         MessageDeduplicationId: newId(),
//         MessageGroupId: messageGroupId,
//         MessageAttributes: {
//           ...messageAttributes,
//           route: {
//             DataType: 'String',
//             StringValue: route,
//           },
//           ...(correlationId
//             ? {
//                 correlationId: {
//                   DataType: 'String',
//                   StringValue: correlationId,
//                 },
//               }
//             : null),
//           ...(replyToQueueUrl
//             ? {
//                 replyToQueue: {
//                   DataType: 'String',
//                   StringValue: replyToQueueUrl,
//                 },
//               }
//             : null),
//         },
//       })
//       .promise()
//   }

//   private async sendMessageToSqs(props: {
//     queueUrl: string
//     message: string
//     metadata: TMetadata
//     messageGroupId: string
//     correlationId: string
//   }) {
//     const {
//       queueUrl,
//       message,
//       metadata,
//       correlationId,
//       messageGroupId,
//     } = props

//     const messageAttributes = Object.fromEntries(
//       Object.entries(metadata).map(([key, value]) => [
//         key,
//         <MessageAttributeValue>{
//           DataType: 'String',
//           StringValue: value,
//         },
//       ]),
//     )

//     await this.sqs
//       .sendMessage({
//         QueueUrl: queueUrl,
//         MessageBody: message,
//         MessageAttributes: {
//           ...messageAttributes,
//           correlationId: {
//             DataType: 'String',
//             StringValue: correlationId,
//           },
//         },
//       })
//       .promise()
//   }

//   private processInitialMessages() {}

//   private async fetchAndProcessData(
//     queueUrl: string,
//     requestAttemptId: string,
//     newId: () => string,
//     queueWaitTimeInSeconds: number,
//     queueMaxNumberOfMessages: number,
//   ) {
//     let keepOldAttemptId: boolean

//     try {
//       const messages = await this.fetchSqsMessages({
//         queueUrl,
//         requestAttemptId,
//         waitTimeInSeconds: queueWaitTimeInSeconds,
//         maxNumberOfMessages: queueMaxNumberOfMessages,
//         isSnsMessage: true,
//       })

//       messages.forEach(async x => {
//         if (
//           shouldRouteAutoComplete(x.route, this.listeningPatterns)
//         ) {
//           await deleteMessage({
//             sqs: this.sqs,
//             queueUrl: this.queueUrl,
//             messageHandle: x.sqs.ReceiptHandle,
//           })
//           return
//         }

//         this.internal$.next({
//           route: x.route,
//           message: x.message,
//           metadata: x.metadata,
//           correlationId: x.correlationId,
//           complete: async success => {
//             if (!success) {
//               await this.sqs
//                 .sendMessage({
//                   QueueUrl: this.deadLetterQueueUrl,
//                   MessageAttributes: x.sqs.MessageAttributes,
//                   MessageBody: x.sqs.Body,
//                 })
//                 .promise()
//             }

//             await deleteMessage({
//               sqs: this.sqs,
//               queueUrl: this.queueUrl,
//               messageHandle: x.sqs.ReceiptHandle,
//             })
//           },
//           sendReply: async (result, resultMetadata) => {
//             this.sendMessageToSqs({
//               queueUrl: x.replyToQueue,
//               correlationId: x.correlationId,
//               message: result,
//               metadata: {
//                 ...x.metadata,
//                 ...resultMetadata,
//               },
//               messageGroupId: newId(),
//             })
//           },
//           sendErrorReply: async err => {
//             this.sendMessageToSqs({
//               queueUrl: x.replyToQueue,
//               correlationId: x.correlationId,
//               message: JSON.stringify({
//                 name: err.name,
//                 message: err.message,
//                 stack: err.stack,
//               }),
//               metadata: {
//                 ...x.metadata,
//                 isError: true,
//               },
//               messageGroupId: newId(),
//             })
//           },
//         })
//       })
//     } catch (err) {
//       console.warn('err on subscribe', this.queueUrl, err)

//       keepOldAttemptId = true
//     }

//     if (this.isPollingStarted) {
//       await this.fetchAndProcessData(
//         queueUrl,
//         keepOldAttemptId ? requestAttemptId : newId(),
//         newId,
//         queueWaitTimeInSeconds,
//         queueMaxNumberOfMessages,
//       )
//     }
//   }

//   private async fetchAndProcessResponseData(
//     queueUrl: string,
//     requestAttemptId: string,
//     newId: () => string,
//     responseQueueWaitTimeInSeconds: number,
//     responseQueueMaxNumberOfMessages: number,
//   ) {
//     let keepOldAttemptId: boolean

//     try {
//       const responseMessages = await this.fetchSqsMessages({
//         queueUrl,
//         requestAttemptId,
//         waitTimeInSeconds: responseQueueWaitTimeInSeconds,
//         maxNumberOfMessages: responseQueueMaxNumberOfMessages,
//         isSnsMessage: false,
//       })

//       responseMessages.forEach(async x => {
//         try {
//           this.internalResponse$.next({
//             route: x.route,
//             message: x.message,
//             metadata: x.metadata,
//             correlationId: x.correlationId,
//             complete: async _ => {},
//             sendReply: async () => {},
//             sendErrorReply: async () => {},
//           })

//           await deleteMessage({
//             sqs: this.sqs,
//             queueUrl,
//             messageHandle: x.sqs.ReceiptHandle,
//           })
//         } catch (err) {
//           console.warn('response err', err)
//         }
//       })
//     } catch (err) {
//       console.warn('err on subscribe', err)

//       keepOldAttemptId = true
//     }

//     if (this.isPollingStarted) {
//       this.fetchAndProcessResponseData(
//         queueUrl,
//         keepOldAttemptId ? requestAttemptId : newId(),
//         newId,
//         responseQueueWaitTimeInSeconds,
//         responseQueueMaxNumberOfMessages,
//       )
//     }
//   }

//   private async fetchSqsMessages(props: {
//     queueUrl: string
//     requestAttemptId: string
//     waitTimeInSeconds: number
//     maxNumberOfMessages: number
//     isSnsMessage: boolean
//   }) {
//     const {
//       queueUrl,
//       requestAttemptId,
//       waitTimeInSeconds,
//       maxNumberOfMessages,
//       isSnsMessage,
//     } = props

//     const result = await this.sqs
//       .receiveMessage({
//         QueueUrl: queueUrl,
//         WaitTimeSeconds: waitTimeInSeconds,
//         MaxNumberOfMessages: maxNumberOfMessages,
//         ReceiveRequestAttemptId: requestAttemptId,
//         MessageAttributeNames: isSnsMessage ? undefined : ['All'],
//       })
//       .promise()

//     return (result.Messages || []).map(x => {
//       const body = isSnsMessage ? JSON.parse(x.Body) : x.Body
//       const message = isSnsMessage ? body.Message : body

//       const fullMetadata = Object.fromEntries(
//         !isSnsMessage
//           ? Object.entries(
//               x.MessageAttributes,
//             ).map(([key, { StringValue }]: any) => [key, StringValue])
//           : Object.entries(
//               body.MessageAttributes,
//             ).map(([key, { Value }]: any) => [key, Value]),
//       )

//       const {
//         route,
//         correlationId,
//         replyToQueue,
//         ...metadata
//       } = fullMetadata

//       return {
//         route,
//         message,
//         metadata,
//         correlationId,
//         replyToQueue,

//         sqs: {
//           ReceiptHandle: x.ReceiptHandle,
//           MessageAttributes: x.MessageAttributes,
//           Body: x.Body,
//         },
//       }
//     })
//   }
// }

// async function ensureTopicExists(props: {
//   sns: AWS.SNS
//   publishExchangeName: string
//   moduleName: string
// }) {
//   const { sns, publishExchangeName, moduleName } = props

//   const topicName = `${publishExchangeName}.fifo`

//   const topics = await sns.listTopics({}).promise()
//   const publishTopicArn = topics?.Topics?.filter(x =>
//     x.TopicArn?.endsWith(topicName),
//   ).map(x => x.TopicArn)[0]
//   // topics.Topics[0].

//   if (publishTopicArn) {
//     return publishTopicArn
//   }

//   const topic = await sns
//     .createTopic({
//       Name: topicName,
//       Attributes: {
//         DisplayName: publishExchangeName,
//         FifoTopic: 'true',
//         // ContentBasedDeduplication: 'false'
//         // Policy: '',
//       },
//       Tags: [
//         {
//           Key: 'module',
//           Value: moduleName,
//         },
//       ],
//     })
//     .promise()

//   return topic.TopicArn
// }

// async function ensureQueueExists(props: {
//   sqs: AWS.SQS
//   queueName: string
//   deadLetterQueueArn: string | null
//   moduleName: string
//   isFifo: boolean
// }) {
//   const {
//     sqs,
//     queueName,
//     deadLetterQueueArn,
//     moduleName,
//     isFifo,
//   } = props

//   const fullQueueName = isFifo ? `${queueName}.fifo` : queueName

//   const queues = await sqs
//     .listQueues({
//       QueueNamePrefix: fullQueueName,
//       MaxResults: 1,
//     })
//     .promise()

//   let queueUrl = queues?.QueueUrls && queues?.QueueUrls[0]
//   if (!queueUrl) {
//     const redrivePolicy = deadLetterQueueArn
//       ? JSON.stringify({
//           deadLetterTargetArn: deadLetterQueueArn,
//           maxReceiveCount: 3,
//         })
//       : null

//     const queue = await sqs
//       .createQueue({
//         QueueName: fullQueueName,
//         tags: {
//           module: moduleName,
//         },
//         Attributes: {
//           ...(redrivePolicy
//             ? { RedrivePolicy: redrivePolicy }
//             : null),

//           ...(isFifo
//             ? {
//                 FifoQueue: 'true',
//                 FifoThroughputLimit: 'perQueue', // 'perQueue' | 'perMessageGroupId'
//                 DeduplicationScope: 'messageGroup', // 'messageGroup' | 'queue'
//               }
//             : null),
//         },
//       })
//       .promise()

//     queueUrl = queue.QueueUrl
//   }

//   const result = await sqs
//     .getQueueAttributes({
//       QueueUrl: queueUrl,
//       AttributeNames: ['QueueArn'],
//     })
//     .promise()

//   return {
//     queueUrl,
//     queueArn: result.Attributes.QueueArn,
//   }
// }

// async function ensureSubscriptionExists(props: {
//   sns: AWS.SNS
//   topicArn: string
//   queueArn: string
//   deadLetterArn: string
//   patterns: string[]
// }) {
//   const { sns, topicArn, queueArn, deadLetterArn, patterns } = props

//   const subscriptions = await sns
//     .listSubscriptionsByTopic({ TopicArn: topicArn })
//     .promise()

//   const subscription = subscriptions.Subscriptions.find(
//     x => x.Endpoint === queueArn,
//   )

//   let subscriptionArn = subscription?.SubscriptionArn
//   if (subscription) {
//     const attr = await sns
//       .getSubscriptionAttributes({
//         SubscriptionArn: subscriptionArn,
//       })
//       .promise()

//     const oldPolicy = attr.Attributes.FilterPolicy
//       ? JSON.parse(attr.Attributes.FilterPolicy)
//       : {}

//     const routeFilters = [...(oldPolicy?.route ?? [])]

//     const applyPatterns = patterns.filter(
//       prefix => !routeFilters.some(x => x.prefix === prefix),
//     )

//     if (applyPatterns.length) {
//       await sns
//         .setSubscriptionAttributes({
//           SubscriptionArn: subscriptionArn,
//           AttributeName: 'FilterPolicy',
//           AttributeValue: JSON.stringify({
//             route: routeFilters.concat(
//               applyPatterns.map(prefix => ({ prefix })),
//             ),
//           }),
//         })
//         .promise()
//     }
//   } else {
//     const result = await sns
//       .subscribe({
//         Protocol: 'sqs',
//         TopicArn: topicArn,
//         Endpoint: queueArn,
//         ReturnSubscriptionArn: true,
//         Attributes: {
//           FilterPolicy: JSON.stringify({
//             route: patterns.map(prefix => ({ prefix })),
//           }),
//           RedrivePolicy: JSON.stringify({
//             deadLetterTargetArn: deadLetterArn,
//           }),
//         },
//       })
//       .promise()

//     subscriptionArn = result.SubscriptionArn
//   }

//   return subscriptionArn
// }

// async function deleteMessage(props: {
//   sqs: AWS.SQS
//   queueUrl: string
//   messageHandle: string
// }) {
//   const { sqs, queueUrl, messageHandle } = props

//   await sqs
//     .deleteMessage({
//       QueueUrl: queueUrl,
//       ReceiptHandle: messageHandle,
//     })
//     .promise()
// }

// async function deleteQueue(props: {
//   sqs: AWS.SQS
//   queueUrl: string
// }) {
//   const { sqs, queueUrl } = props

//   await sqs
//     .deleteQueue({
//       QueueUrl: queueUrl,
//     })
//     .promise()
// }

// function shouldRouteAutoComplete(
//   route: string,
//   listeningPatterns: Set<string>,
// ) {
//   return !listeningPatterns.has(route)
// }
