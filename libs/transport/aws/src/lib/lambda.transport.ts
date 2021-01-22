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
import { listenResponseQueue } from './app/listenResponseQueue'
import { processTriggeredLambdaMessages } from './app/processTriggeredLambdaMessages'
import { sendMessageToSns } from './app/sendMessageToSns'
import { sendMessageToSqs } from './app/sendMessageToSqs'

export class LambdaTransport extends TransportBase {
  constructor(
    protected options: TransportOptions & {
      initialMessages: AWS.SQS.Message[]
      topicArn: string
      responseQueueUrl: string
      deadLetterQueueUrl: string
    },
    protected utils: TransportUtils & {
      getMessageGroup: (route: string) => string
      getSns: () => SNS
      getSqs: () => SQS
    },
  ) {
    super(options, utils)
  }

  async init() {}

  async start() {
    await super.start()

    /**
     * Process initialMessages only
     *
     * No need to listen additional messages
     */

    const { deadLetterQueueUrl, initialMessages } = this.options

    processTriggeredLambdaMessages(
      deadLetterQueueUrl,
      initialMessages,
      () => this.utils.getSqs(),
      async x => this.processMessage(x),
    )

    await super.stop()
  }

  protected newRpcCallRegistered(activeCount: number) {
    /**
     * Start listening response messages only when
     * there will be RPC call
     *
     * And finish listening as soon as there will not be any active calls (lambda optimization)
     */

    if (activeCount === 1) {
      const { responseQueueUrl } = this.options

      let pendingItemsCount = activeCount

      listenResponseQueue({
        sqs: this.utils.getSqs(),
        responseQueueUrl,
        newId: this.utils.newId,
        shouldContinue: () => pendingItemsCount > 0,
        cb: items => {
          for (let item of items) {
            pendingItemsCount = this.processResponseMessage(item)
          }
        },
      })
    }
  }

  protected async sendMessage(props: SendMessageProps) {
    const { topicArn, responseQueueUrl } = this.options

    const { route, metadata, message, correlationId, isRpc } = props

    const sns = this.utils.getSns()

    await sendMessageToSns({
      sns,
      topicArn,
      route,
      message,
      metadata,
      deduplicationId: this.utils.newId(),
      messageGroupId: this.utils.getMessageGroup(route),

      ...(isRpc
        ? {
            replyToQueueUrl: responseQueueUrl,
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
      message: '',
      metadata,
      errorData: normalizeError(error),
    })
  }
}

/**
 * Reference docs:
 * Reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html
 */
