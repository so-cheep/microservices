import { normalizeError } from './domain/normalizeError'
import { FailedMessage } from './transport'
import {
  SendMessageProps,
  SendReplyMessageProps,
  TransportBase,
  TransportOptions,
  TransportUtils,
} from './transport.base'

export class MemoryTransport extends TransportBase {
  private uniqueIndex = 0
  private failedMessagesAction:
    | ((failedMessage: FailedMessage) => Promise<void> | void)
    | null = null

  constructor(
    protected options: TransportOptions & {
      messageDelayTime?: number
    } = {},
    protected utils: TransportUtils = {
      newId: () =>
        Date.now().toString() + (++this.uniqueIndex).toString(),
      jsonEncode: JSON.stringify,
      jsonDecode: JSON.parse,
    },
  ) {
    super(options, utils)
  }

  /**
   * Initializes Memory Transport
   */
  async init() {
    /**/
  }

  async subscribeFailedMessages(
    action: (failedMessage: FailedMessage) => Promise<void> | void,
  ) {
    this.failedMessagesAction = action
  }

  protected async sendMessage(props: SendMessageProps) {
    const { messageDelayTime = 0 } = this.options

    const { route, message, correlationId, isRpc } = props

    const processAction = async () => {
      const replyTo = isRpc ? 'REPLY' : undefined

      try {
        await this.processMessage({
          route,
          message,
          correlationId,
          replyTo,
        })
      } catch (err) {
        const parsedMessage = this.utils.jsonDecode(message)

        /**
         * Check if failed messages action is defined
         * and run it in async mode
         */
        if (this.failedMessagesAction) {
          new Promise(resolve => {
            try {
              this.failedMessagesAction({
                route,
                correlationId,
                replyTo,
                message: {
                  metadata: parsedMessage.metadata,
                  payload: parsedMessage.payload,
                  handlingErrorData: normalizeError(err),
                },
              })
            } catch (err) {
              console.log('Error on processing failled message', err)
            } finally {
              resolve(null)
            }
          })
        }

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
