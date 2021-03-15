import {
  NormalizedError,
  normalizeError,
} from './domain/normalizeError'
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
  RawHandler,
  Referrer,
  RouteHandler,
  Transport,
  TransportMessage,
  TransportState,
} from './transport'
import { WILL_NOT_HANDLE } from './constants'

export interface TransportOptions<
  TMeta extends MessageMetadata = MessageMetadata
> {
  defaultRpcTimeout?: number
  metadataReducers?: MetadataReducer<TMeta>[]
  metadataValidator?: MetadataValidator<TMeta>[]
  failedMessagesQueueName?: string
}

export interface TransportUtils {
  newId: () => string
  jsonEncode: (s: PureMessage) => string
  jsonDecode: (s: string) => PureMessage
}

// const HANDLER_META = Symbol('ROUTE_HANDLER')
export abstract class TransportBase implements Transport {
  private routeHandlers = new Map<string, RouteHandler[]>()
  private prefixHandlers = new Map<
    string,
    Set<FireAndForgetHandler>
  >()
  private rawHandlers = new Map<string, Set<RawHandler>>()
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
    const { route, payload: message, metadata = {}, referrer } = props

    const finalMetadata = this.mergeMetadata({
      currentRoute: route,
      currentPayload: message,
      currentMetadata: metadata,
      referrer,
    })

    await this.sendMessage({
      route,
      message: this.utils.jsonEncode({
        payload: message,
        metadata: finalMetadata,
      }),
    })
  }

  async execute(
    props: ExecuteProps<MessageMetadata>,
  ): Promise<unknown> {
    const { defaultRpcTimeout = 1000 } = this.options

    const {
      route,
      payload: message,
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

          const {
            payload: content,
            errorData,
          } = this.utils.jsonDecode(item.message)

          if (errorData) {
            reject(
              new RemoteError(
                errorData.errorMessage,
                errorData.errorCallStack,
                errorData.errorClassName,
              ),
            )
            return
          }

          resolve(content)
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
      currentPayload: message,
      currentMetadata: metadata,
      referrer,
    })

    await this.sendMessage({
      route,
      message: this.utils.jsonEncode({
        payload: message,
        metadata: finalMetadata,
      }),
      correlationId,
      isRpc: true,
    })

    return resultTask
  }

  // this needs to allow for a fire and forget or a route handler for the router to work
  /** provide a fire-and-forget handler for an array of prefixes*/
  onEvery(
    prefixes: string[],
    action: FireAndForgetHandler,
    isRawHandler?: false,
  ): void
  /** provide raw handler for a specific prefix */
  onEvery(
    prefix: string,
    action: RawHandler,
    isRawHandler: true,
  ): void
  onEvery(
    prefixes: string[] | string,
    action: RawHandler | FireAndForgetHandler,
    isRawHandler?: boolean,
  ): void {
    const safePrefixes = Array.isArray(prefixes)
      ? prefixes
      : [prefixes]

    safePrefixes.forEach(p => this.registeredPrefixes.add(p))

    if (isRawHandler) {
      const prefix = prefixes as string
      // Reflect.defineMetadata(HANDLER_META, true, action)
      const handlers = this.rawHandlers.get(prefix) ?? new Set()
      handlers.add(<RawHandler>action)
      this.rawHandlers.set(prefix, handlers)
    } else {
      safePrefixes.forEach(prefix => {
        const handlers = this.prefixHandlers.get(prefix) ?? new Set()
        handlers.add(<FireAndForgetHandler>action)
        this.prefixHandlers.set(prefix, handlers)
      })
    }
  }

  async dispose() {
    this.routeHandlers.clear()
    this.prefixHandlers.clear()
    this.listenCallbacks.clear()
    this.registeredPrefixes.clear()
  }

  protected async processMessage(msg: TransportMessage) {
    const { metadataValidator } = this.options

    // start processing message
    const message = this.utils.jsonDecode(msg.message)

    // first validate the message
    if (metadataValidator?.length) {
      for (const validateFn of metadataValidator) {
        try {
          validateFn({
            route: msg.route,
            payload: message.payload,
            metadata: message.metadata,
          })
        } catch (err) {
          const isRpc = !!msg.replyTo

          if (isRpc) {
            await this.sendReplyMessage({
              replyTo: msg.replyTo,
              correlationId: msg.correlationId,
              message: this.utils.jsonEncode({
                metadata: message.metadata,
                errorData: normalizeError(err),
              }),
            })
            return
          }

          throw err
        }
      }
    }

    const registeredPrefixes = [
      ...this.registeredPrefixes,
    ].filter(prefix => msg.route.startsWith(prefix))

    // prefix handlers
    if (registeredPrefixes.length) {
      const handlers = registeredPrefixes.flatMap(prefix => {
        const handlerSet = this.prefixHandlers.get(prefix) ?? []

        return (
          [...handlerSet]
            // .filter(
            //   handler =>
            //     // only fire for handlers who DO NOT have the metadata
            //     !Reflect.hasMetadata(HANDLER_META, handler),
            // )
            .map(handler => {
              return new Promise((resolve, reject) => {
                try {
                  handler({
                    route: msg.route,
                    payload: message.payload,
                    metadata: message.metadata,
                  })

                  resolve(true)
                } catch (err) {
                  reject(err)
                }
              }).catch(err => {
                console.warn('onEveryAction.Error', prefix, err)
              })
            })
        )
      })
    }

    // find any prefix handlers that are declared as route handlers
    const rawPrefixHandlers = registeredPrefixes.flatMap(p => [
      ...(this.rawHandlers.get(p) ?? []),
    ])
    // .filter(handler => Reflect.hasMetadata(HANDLER_META, handler))

    // put the route prefix handlers last, so if there are more specific handlers provided, they will be the RPC call
    const routeHandlers = [
      ...(this.routeHandlers.get(msg.route) ?? []),
      ...rawPrefixHandlers,
    ]
    if (routeHandlers?.length) {
      const [routeHandler, ...additionalHandlers] = routeHandlers

      const isRpc = !!msg.replyTo
      let result: unknown

      try {
        // Always call first handler
        // it may be a raw handler, so include the msg prop just in case
        result = await routeHandler(
          {
            route: msg.route,
            payload: message.payload,
            metadata: message.metadata,
          },
          msg,
        )
      } catch (err) {
        if (isRpc) {
          await this.sendReplyMessage({
            replyTo: msg.replyTo,
            correlationId: msg.correlationId,
            message: this.utils.jsonEncode({
              metadata: message.metadata,
              errorData: normalizeError(err),
            }),
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
          message: this.utils.jsonEncode({
            payload: result,
            metadata: message.metadata,
          }),
        })
      }
      // Process additional handlers
      if (additionalHandlers.length) {
        const tasks = additionalHandlers.map((handler: any) =>
          handler(
            {
              route: msg.route,
              payload: message.payload,
              metadata: message.metadata,
            },
            msg,
          ).catch(err => {
            if (err === WILL_NOT_HANDLE) {
              return
            }
            throw { reason: err, handler: handler.name }
          }),
        )

        Promise.allSettled(tasks)
          .then(results =>
            results.filter(r => r.status === 'rejected'),
          )
          .then(errs => {
            if (errs.length > 0) {
              console.warn(
                `Multiple.RouteHandlers.Error @ ${msg.route}`,
                errs,
              )
            }
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
    currentPayload: unknown
  }): MessageMetadata {
    const { metadataReducers = [] } = this.options

    const {
      referrer,
      currentMetadata,
      currentRoute,
      currentPayload,
    } = context

    const merged = metadataReducers.reduce((meta, fn) => {
      const x = fn({
        currentRoute,
        currentPayload,
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
  correlationId?: string
  isRpc?: boolean
}

export interface SendReplyMessageProps {
  replyTo: string
  correlationId: string
  message: string // includes: payload, metadata, errorInfo
}

export interface ListenMessagesProps {
  cb: (items: TransportMessage[]) => void
}

export interface ListenResponseMessagesProps {
  cb: (items: TransportMessage[]) => void
}

export interface PureMessage {
  payload?: unknown
  metadata: MessageMetadata
  errorData?: NormalizedError
}

type ArrayToIntersection<T extends unknown[]> = UnionToIntersection<
  ArrayToUnion<T>
>
type ArrayToUnion<A extends Array<unknown>> = A[number]
type UnionToIntersection<U> = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  U extends any
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never
