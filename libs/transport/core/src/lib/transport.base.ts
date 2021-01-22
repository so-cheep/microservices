import { RemoteError } from './remote.error'
import { RpcTimeoutError } from './rpcTimeout.error'
import {
  ExecuteProps,
  FireAndForgetHandler,
  ListenResponseCallback,
  MessageMetadata,
  MetadataReducer,
  MetadataValidator,
  PublishProps,
  Referrer,
  RouteHandler,
  Transport,
  TransportMessage,
  TransportState,
} from './transport'
import 'reflect-metadata'

export interface TransportOptions<
  TMeta extends MessageMetadata = MessageMetadata
> {
  defaultRpcTimeout?: number
  metadataReducers?: MetadataReducer<TMeta>[]
  metadataValidator?: MetadataValidator<TMeta>[]
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

  private _state: TransportState
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
    const { route, message, metadata = {}, referrer } = props

    const finalMetadata = this.mergeMetadata({
      currentRoute: route,
      currentMessage: message,
      currentMetadata: metadata,
      referrer,
    })

    await this.sendMessage({
      route,
      message: this.utils.jsonEncode(message),
      metadata: finalMetadata,
    })
  }

  async execute(
    props: ExecuteProps<MessageMetadata>,
  ): Promise<unknown> {
    const { defaultRpcTimeout = 1000 } = this.options

    const {
      route,
      message,
      metadata = {},
      referrer,
      rpcTimeout,
    } = props

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

    const finalMetadata = this.mergeMetadata({
      currentRoute: route,
      currentMessage: message,
      currentMetadata: metadata,
      referrer,
    })

    await this.sendMessage({
      route,
      message: this.utils.jsonEncode(message),
      metadata: finalMetadata,
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
    const { metadataValidator } = this.options

    // first validate the message
    if (metadataValidator?.length) {
      for (const validateFn of metadataValidator) {
        try {
          validateFn(msg)
        } catch (err) {
          const isRpc = !!msg.replyTo
          console.log('isRpc', isRpc)
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
      }
    }

    // start processing message
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

  private mergeMetadata(context: {
    referrer?: Referrer
    currentMetadata: MessageMetadata
    currentRoute: string
    currentMessage: unknown
  }): MessageMetadata {
    const { metadataReducers: metadataRules = [] } = this.options

    const {
      referrer,
      currentMetadata,
      currentRoute,
      currentMessage,
    } = context

    const merged = metadataRules.reduce((meta, fn) => {
      const x = fn({
        currentRoute,
        currentMessage,
        currentMetadata: meta,
        referrer,
      })

      return {
        ...meta,
        ...x,
      }
    }, currentMetadata)

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
