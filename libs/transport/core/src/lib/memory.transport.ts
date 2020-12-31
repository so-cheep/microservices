import { Observable, Subject } from 'rxjs'
import { RpcTimeoutError } from './rpcTimeout.error'
import {
  MessageMetadata,
  PublishProps,
  PublishResult,
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

  private internal$ = new Subject<
    TransportItem<TMetadata & { originModule: string }>
  >()

  constructor(args: { moduleName: string }) {
    this.moduleName = args.moduleName

    this.message$ = this.internal$.asObservable()
  }

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

      this.internal$.next(<any>item)
    })
  }

  listenPatterns(): void {
    return
  }

  start(): void {
    return
  }

  stop(): void {
    return
  }

  dispose(): void {
    this.internal$.complete()
  }
}
