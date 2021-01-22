import { normalizeError } from './domain/normalizeError'
import { MessageMetadata } from './transport'
import {
  SendErrorReplyMessageProps,
  SendMessageProps,
  SendReplyMessageProps,
  TransportBase,
  TransportOptions,
  TransportUtils,
} from './transport.base'

export class MemoryTransport<
  TMeta extends MessageMetadata = MessageMetadata
> extends TransportBase {
  constructor(
    protected options: TransportOptions<TMeta> & {
      messageDelayTime?: number
    },
    protected utils: TransportUtils,
  ) {
    super(options, utils)
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async init() {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async start() {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async stop() {}

  protected async sendMessage(props: SendMessageProps) {
    const { messageDelayTime = 0 } = this.options

    const { route, message, metadata, correlationId, isRpc } = props

    const processAction = async () => {
      try {
        await this.processMessage({
          route,
          message,
          metadata,
          correlationId,
          replyTo: isRpc ? 'REPLY' : undefined,
        })
      } catch (err) {
        if (isRpc) {
          throw err
        } else {
          console.error('err', err)
        }
      }
    }

    if (!messageDelayTime) {
      await processAction()
      return
    }

    setTimeout(() => processAction(), messageDelayTime)
  }

  protected async sendReplyMessage(props: SendReplyMessageProps) {
    const { messageDelayTime = 0 } = this.options

    const { replyTo, message, correlationId, metadata } = props

    const processAction = async () => {
      try {
        this.processResponseMessage({
          route: replyTo,
          message,
          metadata,
          correlationId,
          replyTo: undefined,
        })
      } catch (err) {
        console.error('err', err)
      }
    }

    if (!messageDelayTime) {
      await processAction()
      return
    }

    setTimeout(() => processAction(), messageDelayTime)
  }

  protected async sendErrorReplyMessage(
    props: SendErrorReplyMessageProps,
  ) {
    const { replyTo, metadata, correlationId, error } = props

    this.processResponseMessage({
      route: replyTo,
      message: '',
      metadata,
      correlationId,
      replyTo: undefined,
      errorData: normalizeError(error),
    })
  }
}
