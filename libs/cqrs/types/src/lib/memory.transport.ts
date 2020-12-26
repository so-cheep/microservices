import { Observable, Subject } from 'rxjs'
import { RpcTimeoutError } from './errors'
import {
  IPublishProps,
  ITransport,
  ITransportItem,
} from './transport'

export class MemoryTransport implements ITransport {
  moduleName?: string

  _message$ = new Subject<ITransportItem<never, unknown>>()
  get message$(): Observable<ITransportItem<never, unknown>> {
    return this._message$.asObservable()
  }

  constructor(args: { moduleName: string }) {
    this.moduleName = args.moduleName
  }

  publish<TResult, TMeta extends never = never>(
    props: IPublishProps<TMeta, unknown>,
  ): Promise<{ result: TResult; metadata: TMeta }> {
    return new Promise<{ result: TResult; metadata: TMeta }>(
      (resolve, reject) => {
        const timeout = props.rpc.enabled
          ? setTimeout(() => {
              reject(new RpcTimeoutError(props))
            }, props.rpc.timeout)
          : undefined

        const item: ITransportItem<TMeta, unknown, TResult> = {
          message: props.message,
          metadata: props.metadata,
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
