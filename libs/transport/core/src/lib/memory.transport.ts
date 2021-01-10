import {
  SendErrorReplyMessageProps,
  SendMessageProps,
  SendReplyMessageProps,
  TransportBase,
  TransportOptions,
  TransportUtils,
} from './transport.base'

export class MemoryTransport extends TransportBase {
  constructor(
    protected options: TransportOptions & {
      messageDelayTime?: number
    },
    protected utils: TransportUtils,
  ) {
    super(options, utils)
  }

  async init() {}

  async start() {}

  async stop() {}

  protected async sendMessage(props: SendMessageProps) {
    const { messageDelayTime = 0 } = this.options

    const { route, message, metadata, correlationId, isRpc } = props

    if (!messageDelayTime) {
      this.processMessage({
        route,
        message,
        metadata,
        correlationId,
        replyTo: isRpc ? 'REPLY' : undefined,
      })

      return
    }

    setTimeout(() => {
      this.processMessage({
        route,
        message,
        metadata,
        correlationId,
        replyTo: isRpc ? 'REPLY' : undefined,
      })
    }, messageDelayTime)
  }

  protected async sendReplyMessage(props: SendReplyMessageProps) {
    const { messageDelayTime = 0 } = this.options

    const { replyTo, message, correlationId, metadata } = props

    if (!messageDelayTime) {
      this.processResponseMessage({
        route: replyTo,
        message,
        metadata,
        correlationId,
        replyTo: undefined,
      })

      return
    }

    setTimeout(() => {
      this.processResponseMessage({
        route: replyTo,
        message,
        metadata,
        correlationId,
        replyTo: undefined,
      })
    }, messageDelayTime)
  }

  protected async sendErrorReplyMessage(
    props: SendErrorReplyMessageProps,
  ) {
    const { error } = props

    throw error
  }
}
