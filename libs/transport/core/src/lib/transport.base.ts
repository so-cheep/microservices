import { RemoteError } from './remote.error'
import { RpcTimeoutError } from './rpcTimeout.error'
import {
  ExecuteProps,
  FireAndForgetHandler,
  ListenResponseCallback,
  MessageMetadata,
  PublishProps,
  RouteHandler,
  Transport,
  TransportMessage,
} from './transport'

export interface TransportOptions {
  defaultRpcTimeout?: number
}

export interface TransportUtils {
  newId: () => string
  jsonEncode: (s: unknown) => string
  jsonDecode: (s: string) => unknown
}

export abstract class TransportBase implements Transport {
  private routeHandlers = new Map<string, RouteHandler[]>()
  private prefixHandlers = new Map<string, FireAndForgetHandler>()
  private registeredPrefixes: string[] = []
  private listenCallbacks = new Map<string, ListenResponseCallback>()

  constructor(
    protected options: TransportOptions,
    protected utils: TransportUtils,
  ) {}

  abstract init(): Promise<void>

  abstract start(): Promise<void>

  abstract stop(): Promise<void>

  protected abstract sendMessage(
    props: SendMessageProps,
  ): Promise<void>

  protected abstract sendReplyMessage(
    props: SendReplyMessageProps,
  ): Promise<void>

  protected abstract sendErrorReplyMessage(
    props: SendErrorReplyMessageProps,
  ): Promise<void>

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

    let correlationId = this.utils.newId()

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

          const result = this.utils.jsonDecode(item.message)

          resolve(result)
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
      this.registeredPrefixes.push(x)
      this.prefixHandlers.set(x, action)
    })
  }

  async dispose() {
    this.routeHandlers.clear()
    this.prefixHandlers.clear()
    this.listenCallbacks.clear()
    this.registeredPrefixes = []
  }

  protected async processMessage(msg: TransportMessage) {
    const message = this.utils.jsonDecode(msg.message)

    const registeredPrefixes = this.registeredPrefixes.filter(
      prefix => msg.route.startsWith(prefix),
    )

    // prefix handlers
    if (registeredPrefixes.length) {
      const handlers = registeredPrefixes.map(prefix => {
        const handler = this.prefixHandlers.get(prefix)

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
          message: this.utils.jsonEncode(result ?? ''),
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
