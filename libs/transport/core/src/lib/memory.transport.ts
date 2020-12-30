import {
  MessageMetadata,
  PublishProps,
  PublishResult,
  RpcTimeoutError,
  Transport,
  TransportItem,
} from '@nx-cqrs/transport/shared'
import { Observable, Subject } from 'rxjs'

export class MemoryTransport<
  TMetadata extends MessageMetadata,
  TMessage
> implements Transport<TMetadata, TMessage> {
  moduleName?: string

  message$: Observable<
    TransportItem<
      TMetadata & { originModule: string },
      TMessage,
      unknown
    >
  >

  private internal$ = new Subject<
    TransportItem<
      TMetadata & { originModule: string },
      TMessage,
      unknown
    >
  >()

  constructor(args: { moduleName: string }) {
    this.moduleName = args.moduleName

    this.message$ = this.internal$.asObservable()
  }

  publish<TResult, TMeta extends TMetadata = never>(
    props: PublishProps<TMeta, unknown>,
  ): Promise<PublishResult<TResult, TMeta>> {
    const { message, metadata, route, rpc } = props

    return new Promise<PublishResult<TResult, TMeta>>(
      (resolve, reject) => {
        const timeout = rpc.enabled
          ? setTimeout(() => {
              reject(new RpcTimeoutError(<any>props))
            }, rpc.timeout)
          : undefined

        const item: TransportItem<TMeta, unknown, TResult> = {
          route,
          message,
          metadata,

          // currently ignoring completion, because it's in memory!
          complete: () => {
            if (timeout) {
              clearTimeout(timeout)
            }
          },

          sendReply: async (result, resultMetadata) =>
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
      },
    )
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
