import { RemoteError } from './remote.error'
import { RpcTimeoutError } from './rpcTimeout.error'
import {
  ExecuteProps,
  FireAndForgetHandler,
  ListenResponseCallback,
  MessageMetadata,
  MetdataToken,
  PublishProps,
  RouteHandler,
  Transport,
  TransportMessage,
  TransportState,
} from './transport'
import 'reflect-metadata'

export type MetaMergeFunction<
  TMeta extends MessageMetadata = MessageMetadata
> = (context: {
  referrerMetadata?: TMeta
  currentMetadata: Partial<TMeta>
  route: string
  message: unknown
}) => Partial<TMeta>

export interface TransportOptions<
  TMeta extends MessageMetadata = MessageMetadata
> {
  defaultRpcTimeout?: number
  metadataMerge?: MetaMergeFunction<TMeta>[]
}

export interface TransportUtils {
  newId: () => string
  jsonEncode: (s: unknown) => string
  jsonDecode: (s: string) => unknown
}

export abstract class TransportBase implements Transport {
  private routeHandlers = new Map<string, RouteHandler[]>()
  private prefixHandlers = new Map<
    string,
    Set<FireAndForgetHandler>
  >()
  private registeredPrefixes = new Set<string>()
  private listenCallbacks = new Map<string, ListenResponseCallback>()

  _state: TransportState
  get state(): TransportState {
    return this._state
  }

  constructor(
    protected options: TransportOptions,
    protected utils: TransportUtils,
  ) {}

  abstract init(): Promise<void>

  async start() {
    this._state = TransportState.STARTED
  }

  async stop() {
    this._state = TransportState.STOPPED
  }

  protected abstract sendMessage(
    props: SendMessageProps,
  ): Promise<void>

  protected abstract sendReplyMessage(
    props: SendReplyMessageProps,
  ): Promise<void>

  protected abstract sendErrorReplyMessage(
    props: SendErrorReplyMessageProps,
  ): Promise<void>

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected newRpcCallRegistered(activeRpcCallsCount: number) {}

  on(route: string, action: RouteHandler) {
    const handlers = this.routeHandlers.get(route)
    if (handlers) {
      this.routeHandlers.set(route, handlers.concat([action]))
    } else {
      this.routeHandlers.set(route, [action])
    }

    return () => {
      let handlers = this.routeHandlers.get(route)
      if (!handlers) {
        return
      }

      if (handlers.length) {
        handlers = handlers.filter(x => x !== action)
      }

      if (handlers.length) {
        this.routeHandlers.set(route, handlers)
      } else {
        this.routeHandlers.delete(route)
      }
    }
  }

  off(route: string) {
    if (this.routeHandlers.has(route)) {
      this.routeHandlers.delete(route)
    }
  }

  async publish(props: PublishProps<MessageMetadata>) {
    const { route, message, metadata = {} } = props

    await this.sendMessage({
      route,
      message: this.utils.jsonEncode(message),
      metadata,
    })
  }

  async execute(
    props: ExecuteProps<MessageMetadata>,
  ): Promise<unknown> {
    const { defaultRpcTimeout = 1000 } = this.options

    const { route, message, metadata = {}, rpcTimeout } = props

    const correlationId = this.utils.newId()

    const rpcCallTimeout = rpcTimeout ?? defaultRpcTimeout

    const resultTask = new Promise((resolve, reject) => {
      try {
        // register response callback based on the correlationId
        this.listenCallbacks.set(correlationId, item => {
          clearTimeout(timer)

          if (item.errorData) {
            reject(
              new RemoteError(
                item.errorData.errorMessage,
                item.errorData.errorCallStack,
                item.errorData.errorClassName,
              ),
            )
            return
          }

          const decodedMessage: { result: unknown } = <any>(
            this.utils.jsonDecode(item.message)
          )

          resolve(decodedMessage.result)
        })

        // RPC Timeout logic
        const timer = setTimeout(() => {
          this.listenCallbacks.delete(correlationId)
          clearTimeout(timer)

          reject(new RpcTimeoutError(props))
        }, rpcCallTimeout)

        this.newRpcCallRegistered(this.listenCallbacks.size)
      } catch (err) {
        reject(err)
      }
    })

    await this.sendMessage({
      route,
      message: this.utils.jsonEncode(message),
      metadata,
      correlationId,
      isRpc: true,
    })

    return await resultTask
  }

  onEvery(prefixes: string[], action: FireAndForgetHandler) {
    prefixes.forEach(x => {
      this.registeredPrefixes.add(x)
      const handlers = this.prefixHandlers.get(x) ?? new Set()
      handlers.add(action)
      this.prefixHandlers.set(x, handlers)
    })
  }

  async dispose() {
    this.routeHandlers.clear()
    this.prefixHandlers.clear()
    this.listenCallbacks.clear()
    this.registeredPrefixes.clear()
  }

  protected async processMessage(msg: TransportMessage) {
    const message = this.utils.jsonDecode(msg.message)

    const registeredPrefixes = [
      ...this.registeredPrefixes,
    ].filter(prefix => msg.route.startsWith(prefix))

    // prefix handlers
    if (registeredPrefixes.length) {
      const handlers = registeredPrefixes.flatMap(prefix => {
        const handlerSet = this.prefixHandlers.get(prefix)

        return [...handlerSet].map(handler => {
          return new Promise((resolve, reject) => {
            try {
              handler({
                route: msg.route,
                message,
                metadata: msg.metadata,
              })

              resolve(true)
            } catch (err) {
              reject(err)
            }
          }).catch(err => {
            console.warn('onEveryAction.Error', prefix, err)
          })
        })
      })
    }

    const routeHandlers = this.routeHandlers.get(msg.route)
    if (routeHandlers?.length) {
      const [routeHandler, ...additionalHandlers] = routeHandlers

      const isRpc = !!msg.replyTo
      let result: unknown

      try {
        // Always call first handler
        result = await routeHandler({
          route: msg.route,
          message,
          metadata: msg.metadata,
        })
      } catch (err) {
        if (isRpc) {
          await this.sendErrorReplyMessage({
            replyTo: msg.replyTo,
            correlationId: msg.correlationId,
            metadata: msg.metadata,
            error: err,
          })

          return
        }

        throw err
      }

      /**
       * Send reply if it was called with Execute
       */
      if (isRpc) {
        await this.sendReplyMessage({
          replyTo: msg.replyTo,
          correlationId: msg.correlationId,
          metadata: msg.metadata,
          message: this.utils.jsonEncode({ result }),
        })
      }
      // Process additional handlers
      else if (additionalHandlers.length) {
        const tasks = additionalHandlers.map(handler =>
          handler({
            route: msg.route,
            message,
            metadata: msg.metadata,
          }),
        )

        Promise.allSettled(tasks)
          .then(items =>
            items
              .filter(x => x.status === 'rejected')
              .map(x => x.status === 'rejected' && x.reason),
          )
          .then(errs => {
            console.warn('Multiple.RouteHandlers.Error', errs)
          })
      }
    }
  }

  protected processResponseMessage(msg: TransportMessage) {
    const key = msg.correlationId
    if (!key) {
      return
    }

    const callback = this.listenCallbacks.get(key)
    if (!callback) {
      return
    }

    this.listenCallbacks.delete(key)

    callback(msg)

    return this.listenCallbacks.size
  }

  protected getRegisteredRoutes(): string[] {
    return [...this.routeHandlers.keys()]
  }

  protected getRegisteredPrefixes(): string[] {
    return [...this.prefixHandlers.keys()]
  }

  mergeMetadata(context: {
    referrerMetadata?: MessageMetadata
    currentMetadata: Partial<MessageMetadata>
    route: string
    message: unknown
  }): MessageMetadata {
    const {
      referrerMetadata,
      currentMetadata,
      route,
      message,
    } = context
    const merged =
      this.options.metadataMerge?.reduce((meta, fn) => {
        const x = fn({
          route,
          message,
          currentMetadata: meta,
          referrerMetadata,
        })
        return {
          ...meta,
          ...x,
        }
        return
      }, currentMetadata) ?? currentMetadata

    Reflect.defineMetadata(MetdataToken, true, merged)
    return merged
  }
}

export interface SendMessageProps {
  route: string
  message: string
  metadata: MessageMetadata
  correlationId?: string
  isRpc?: boolean
}

export interface SendReplyMessageProps {
  replyTo: string
  correlationId: string
  metadata: MessageMetadata
  message: string
}

export interface SendErrorReplyMessageProps {
  replyTo: string
  correlationId: string
  metadata: MessageMetadata
  error: Error
}

export interface ListenMessagesProps {
  cb: (items: TransportMessage[]) => void
}

export interface ListenResponseMessagesProps {
  cb: (items: TransportMessage[]) => void
}
