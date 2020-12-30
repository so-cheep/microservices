import { Observable, Subject } from 'rxjs'
import {
  MessageMetadata,
  PublishProps,
  Transport,
  TransportItem,
} from './transport'
import { RpcTimeoutError } from './errors'

export class MemoryTransport<
  TTransportMeta extends MessageMetadata = MessageMetadata,
  TMessage = unknown,
  TNamespace extends string = string
> implements Transport<TTransportMeta, TMessage, TNamespace> {
  moduleName: TNamespace

  _message$ = new Subject<TransportItem<TTransportMeta, TMessage>>()
  get message$(): Observable<
    TransportItem<TTransportMeta, TMessage>
  > {
    return this._message$.asObservable()
  }

  constructor(args: { moduleName: TNamespace }) {
    this.moduleName = args.moduleName
  }

  publish<TResult, TMeta extends TTransportMeta = TTransportMeta>(
    props: PublishProps<TMeta, TMessage>,
  ): Promise<{ result: TResult; metadata: TMeta }> {
    return new Promise<{ result: TResult; metadata: TMeta }>(
      (resolve, reject) => {
        const timeout = props.rpc?.enabled
          ? setTimeout(() => {
              reject(new RpcTimeoutError(props))
            }, props.rpc.timeout)
          : undefined

        const item: TransportItem<TMeta, TMessage, TResult> = {
          message: props.message,
          metadata: {
            ...props.metadata,
            originModule: this.moduleName,
          },
          route: props.route,
          // currently ignoring completion, because it's in memory!
          complete: () => {
            if (timeout) {
              clearTimeout(timeout)
            }
          },
          sendReply: (result, metadata) =>
            Promise.resolve(resolve({ result, metadata })),
        }

        this._message$.next(item)
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
    this._message$.complete()
  }
}
