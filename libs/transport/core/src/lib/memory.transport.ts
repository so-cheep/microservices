import { MessageMetadata } from './transport'
import {
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

  protected async sendMessage(props: SendMessageProps) {
    const { messageDelayTime = 0 } = this.options

    const { route, message, correlationId, isRpc } = props

    const processAction = async () => {
      try {
        await this.processMessage({
          route,
          message,
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

    const { replyTo, message, correlationId } = props

    const processAction = async () => {
      try {
        this.processResponseMessage({
          route: replyTo,
          message,
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
}
