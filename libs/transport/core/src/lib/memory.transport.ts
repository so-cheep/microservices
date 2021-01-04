import { Observable, Subject } from 'rxjs'
import { RpcTimeoutError } from './rpcTimeout.error'
import {
  FireAndForgetHandler,
  MessageMetadata,
  PublishProps,
  PublishResult,
  RouteHandler,
  Transport,
  TransportItem,
} from './transport'

export class MemoryTransport<
  TMetadata extends MessageMetadata = MessageMetadata
> implements Transport<TMetadata> {
  moduleName?: string

  message$: Observable<
    TransportItem<TMetadata & { originModule: string }>
  >

  private routeHandlers = new Map<string, RouteHandler>()
  private onEveryMessageAction: FireAndForgetHandler<TMetadata>

  private internal$ = new Subject<
    TransportItem<TMetadata & { originModule: string }>
  >()

  constructor(args: { moduleName: string }) {
    this.moduleName = args.moduleName

    this.message$ = this.internal$.asObservable()
  }

  async init() {}

  publish<TMeta extends TMetadata = never>(
    props: PublishProps<TMeta>,
  ): Promise<PublishResult<TMeta>> {
    const { message, metadata, route, rpc } = props

    return new Promise<PublishResult<TMeta>>((resolve, reject) => {
      const timeout = rpc?.enabled
        ? setTimeout(() => {
            reject(new RpcTimeoutError(<any>props))
          }, rpc.timeout)
        : undefined

      const item: TransportItem<TMeta> = {
        route,
        message,
        metadata,

        // currently ignoring completion, because it's in memory!
        complete: () => {
          if (timeout) {
            clearTimeout(timeout)
          }
        },

        sendReply: async (result: any, resultMetadata) =>
          resolve({
            result,
            metadata: {
              ...metadata,
              ...resultMetadata,
            },
          }),

        sendErrorReply: async err => {
          reject(err)
        },
      }

      const handler = this.routeHandlers.get(item.route)
      if (handler) {
        handler(item)
      }

      if (this.onEveryMessageAction) {
        this.onEveryMessageAction({
          route: item.route,
          message: item.message,
          metadata: item.metadata,
        })
      }

      this.internal$.next(<any>item)
    })
  }

  on(route: string, action: RouteHandler<TMetadata>) {
    this.routeHandlers.set(route, action)
  }

  onEvery(action: FireAndForgetHandler<TMetadata>) {
    this.onEveryMessageAction = action
  }

  start(): void {
    return
  }

  stop(): void {
    return
  }

  async dispose() {
    this.internal$.complete()
  }
}
