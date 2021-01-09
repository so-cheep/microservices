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
  private listenCallbacks: ListenResponseCallback[] = []

  constructor(
    protected options: TransportOptions,
    protected utils: TransportUtils,
  ) {}

  abstract init(): Promise<void>

  async start() {
    this.listenMessages({
      cb: items => {
        items.forEach(x => this.processMessage({ msg: x }))
        return 1
      },
    })
  }

  async stop() {}

  protected abstract sendMessage(
    props: SendMessageProps,
  ): Promise<void>

  protected abstract sendReplyMessage(
    props: SendReplyMessageProps,
  ): Promise<void>

  protected abstract listenMessages(props: ListenMessagesProps): void

  protected abstract listenResponseMessages(
    props: ListenMessagesProps,
  ): void

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

    await this.sendMessage({
      route,
      message: this.utils.jsonEncode(message),
      metadata,
      correlationId,
      isRpc: true,
    })

    const rpcCallTimeout = rpcTimeout ?? defaultRpcTimeout

    return new Promise((resolve, reject) => {
      try {
        const cb = items => {
          const item = items.find(
            x => x.correlationId === correlationId,
          )

          if (!item) {
            return false
          }

          clearTimeout(timer)

          const result = this.utils.jsonDecode(item.message)

          resolve(result)

          return true
        }

        const unsubscribe = this.startListenResponses(cb)

        const timer = setTimeout(() => {
          unsubscribe()
          clearTimeout(timer)

          reject(new RpcTimeoutError(props))
        }, rpcCallTimeout)
      } catch (err) {
        reject(err)
      }
    })
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
    this.registeredPrefixes = []
    this.listenCallbacks = []
  }

  protected async processMessage(props: { msg: TransportMessage }) {
    const { msg } = props

    const message = this.utils.jsonDecode(msg.message)

    const registeredPrefixes = this.registeredPrefixes.filter(
      prefix => msg.route.startsWith(prefix),
    )
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
          console.warn('onEveryAction.Error', err)
        })
      })
    }

    const routeHandlers = this.routeHandlers.get(msg.route)
    if (routeHandlers?.length) {
      const [routeHandler, ...additionalHandlers] = routeHandlers

      // Always call first handler
      const result = await routeHandler({
        route: msg.route,
        message,
        metadata: msg.metadata,
      })

      /**
       * Send reply if it was called with Execute
       */
      if (msg.replyTo) {
        this.sendReplyMessage({
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

  private startListenResponses(cb: ListenResponseCallback) {
    this.listenCallbacks.push(cb)

    if (this.listenCallbacks.length === 1) {
      this.listenResponseMessages({
        cb: items => {
          const finishedCallbackIndexes = this.listenCallbacks
            .map((cb, i) => (cb(items) ? i : null))
            .filter(x => x !== null)

          this.listenCallbacks = this.listenCallbacks.filter(
            (_, i) => !finishedCallbackIndexes.includes(i),
          )

          return this.listenCallbacks.length
        },
      })
    }

    return () => {
      this.listenCallbacks = this.listenCallbacks.filter(
        x => x !== cb,
      )
    }
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

export interface ListenMessagesProps {
  cb: (items: TransportMessage[]) => number
}
