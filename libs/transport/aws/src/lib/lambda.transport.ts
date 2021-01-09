import {
  ListenMessagesProps,
  SendMessageProps,
  SendReplyMessageProps,
  TransportBase,
} from '@cheep/transport'
import type { SNS, SQS } from 'aws-sdk'
import { listenResponseQueue } from './app/listenResponseQueue'
import { processTriggeredLambdaMessages } from './app/processTriggeredLambdaMessages'
import { sendMessageToSns } from './app/sendMessageToSns'
import { sendMessageToSqs } from './app/sendMessageToSqs'

export class LambdaTransport extends TransportBase {
  constructor(
    protected options: {
      initialMessages: AWS.SQS.Message[]
      topicArn: string
      responseQueueUrl: string
      deadLetterQueueUrl: string
      defaultRpcTimeout?: number
    },
    protected utils: {
      jsonEncode: (s: unknown) => string
      jsonDecode: (s: string) => unknown
      newId: () => string
      getMessageGroup: (route: string) => string
      getSns: () => SNS
      getSqs: () => SQS
    },
  ) {
    super(options, utils)
  }

  async init() {}

  async start() {
    const { deadLetterQueueUrl, initialMessages } = this.options

    processTriggeredLambdaMessages(
      deadLetterQueueUrl,
      initialMessages,
      () => this.utils.getSqs(),
      async x => {
        this.processMessage({
          msg: x,
        })
      },
    )
  }

  async stop() {}

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

  protected async listenMessages({ cb }: ListenMessagesProps) {}

  protected async listenResponseMessages({
    cb,
  }: ListenMessagesProps) {
    const { responseQueueUrl } = this.options

    const sqs = this.utils.getSqs()

    let pendingItemsCount = 1

    listenResponseQueue({
      sqs,
      responseQueueUrl,
      newId: this.utils.newId,
      shouldContinue: () => pendingItemsCount > 0,
      cb: items => {
        pendingItemsCount = cb(items)
      },
    })
  }
}

/**
 * Reference docs:
 * Reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html
 */
