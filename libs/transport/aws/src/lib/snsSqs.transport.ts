import {
  normalizeError,
  SendErrorReplyMessageProps,
  SendMessageProps,
  SendReplyMessageProps,
  TransportBase,
  TransportOptions,
  TransportUtils,
} from '@cheep/transport'
import type { SNS, SQS } from 'aws-sdk'
import { deleteQueue } from './app/deleteQueue'
import { ensureQueueExists } from './app/ensureQueueExists'
import { ensureSubscriptionExists } from './app/ensureSubscriptionExists'
import { ensureTopicExists } from './app/ensureTopicExists'
import { listenQueue } from './app/listenQueue'
import { listenResponseQueue } from './app/listenResponseQueue'
import { processSqsMessages } from './app/processSqsMessages'
import { sendMessageToSns } from './app/sendMessageToSns'
import { sendMessageToSqs } from './app/sendMessageToSqs'

export class SnsSqsTransport extends TransportBase {
  private isStarted: boolean
  private topicArn: string
  private queueArn: string
  private queueUrl: string
  private deadLetterQueueArn: string
  private deadLetterQueueUrl: string
  private responseQueueUrl: string

  constructor(
    protected options: TransportOptions & {
      config:
        | {
            type: 'AUTO'
            moduleName: string
            publishTopicName: string
          }
        | {
            type: 'MANUAL'
            topicArn: string
            queueArn: string
            queueUrl: string
            deadLetterQueueArn: string
            deadLetterQueueUrl: string
          }

      queueWaitTimeInSeconds?: number
      queueMaxNumberOfMessages?: number

      responseQueueWaitTimeInSeconds?: number
      responseQueueMaxNumberOfMessages?: number
    },
    protected utils: TransportUtils & {
      getMessageGroup: (route: string) => string
      getSns: () => SNS
      getSqs: () => SQS
    },
  ) {
    super(options, utils)
  }

  async init() {
    const { config } = this.options

    switch (config.type) {
      case 'AUTO':
        {
          const { moduleName, publishTopicName } = config

          const rpcResponseQueueName = `Response-${moduleName}-${this.utils.newId()}`

          this.topicArn = await ensureTopicExists({
            sns: this.utils.getSns(),
            publishTopicName,
            tagName: moduleName,
          })

          const deadLetterQueue = await ensureQueueExists({
            sqs: this.utils.getSqs(),
            queueName: `DL-${moduleName}`,
            deadLetterQueueArn: null,
            tagName: moduleName,
            isFifo: true,
          })

          const queue = await ensureQueueExists({
            sqs: this.utils.getSqs(),
            queueName: moduleName,
            deadLetterQueueArn: deadLetterQueue.queueArn,
            tagName: moduleName,
            isFifo: true,
          })

          const responseQueue = await ensureQueueExists({
            sqs: this.utils.getSqs(),
            queueName: rpcResponseQueueName,
            deadLetterQueueArn: null,
            tagName: moduleName,
            isFifo: false,
          })

          this.queueArn = queue.queueArn
          this.queueUrl = queue.queueUrl
          this.responseQueueUrl = responseQueue.queueUrl
          this.deadLetterQueueArn = deadLetterQueue.queueArn
          this.deadLetterQueueUrl = deadLetterQueue.queueUrl
        }
        break

      case 'MANUAL':
        {
          const rpcResponseQueueName = `Response-${this.utils.newId()}`

          const responseQueue = await ensureQueueExists({
            sqs: this.utils.getSqs(),
            queueName: rpcResponseQueueName,
            deadLetterQueueArn: null,
            tagName: null,
            isFifo: false,
          })

          this.topicArn = config.topicArn
          this.queueArn = config.queueArn
          this.queueUrl = config.queueUrl
          this.responseQueueUrl = responseQueue.queueUrl
          this.deadLetterQueueArn = config.queueArn
          this.deadLetterQueueUrl = config.queueUrl
        }
        break
    }

    // listen messages
    listenQueue({
      sqs: this.utils.getSqs(),
      queueUrl: this.queueUrl,
      isSnsMessage: true,
      maxNumberOfMessages: this.options.queueMaxNumberOfMessages,
      waitTimeInSeconds: this.options.queueWaitTimeInSeconds,
      newId: () => this.utils.newId(),
      requestAttemptId: this.utils.newId(),
      shouldContinue: () => this.isStarted,
      cb: async items => {
        processSqsMessages(
          this.queueUrl,
          this.deadLetterQueueUrl,
          items,
          this.utils.getSqs,
          x => this.processMessage(x),
        )
      },
    })
  }

  async start() {
    this.isStarted = true

    const routes = this.getRegisteredRoutes()
    const prefixes = this.getRegisteredPrefixes()

    await ensureSubscriptionExists({
      sns: this.utils.getSns(),
      topicArn: this.topicArn,
      queueArn: this.queueArn,
      deadLetterArn: this.deadLetterQueueArn,
      routes,
      prefixes,
    })
  }

  async stop() {
    this.isStarted = false
  }

  async dispose() {
    await super.dispose()

    await deleteQueue({
      sqs: this.utils.getSqs(),
      queueUrl: this.responseQueueUrl,
    })
  }

  protected async sendMessage(props: SendMessageProps) {
    const { route, metadata, message, correlationId, isRpc } = props

    const sns = this.utils.getSns()

    await sendMessageToSns({
      sns,
      topicArn: this.topicArn,
      route,
      message,
      metadata,
      deduplicationId: this.utils.newId(),
      messageGroupId: this.utils.getMessageGroup(route),

      ...(isRpc
        ? {
            replyToQueueUrl: this.responseQueueUrl,
            correlationId,
          }
        : null),
    })
  }

  protected async sendReplyMessage(
    props: SendReplyMessageProps,
  ): Promise<void> {
    const {
      replyTo: queueUrl,
      correlationId,
      message,
      metadata,
    } = props

    const sqs = this.utils.getSqs()

    await sendMessageToSqs({
      sqs,
      queueUrl,
      correlationId,
      message,
      metadata,
    })
  }

  protected async sendErrorReplyMessage(
    props: SendErrorReplyMessageProps,
  ): Promise<void> {
    const {
      replyTo: queueUrl,
      correlationId,
      error,
      metadata,
    } = props

    const sqs = this.utils.getSqs()

    await sendMessageToSqs({
      sqs,
      queueUrl,
      correlationId,
      message: 'ERROR',
      metadata,
      errorData: normalizeError(error),
    })
  }

  protected newRpcCallRegistered(activeCount: number) {
    if (activeCount === 1) {
      let pendingItemsCount = activeCount

      listenResponseQueue({
        sqs: this.utils.getSqs(),
        responseQueueUrl: this.responseQueueUrl,
        newId: this.utils.newId,
        shouldContinue: () => pendingItemsCount > 0,
        cb: items => {
          for (let item of items) {
            try {
              pendingItemsCount = this.processResponseMessage(item)
            } catch (err) {
              console.warn(err)
            }
          }
        },
      })
    }
  }
}
