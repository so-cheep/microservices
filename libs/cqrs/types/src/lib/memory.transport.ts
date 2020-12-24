import { Observable, Subject } from 'rxjs'
import {
  IPublishProps,
  ITransport,
  ITransportItem,
} from './transport'
import { RpcTimeoutError } from './errors'

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
    return Promise.race([
      new Promise<{ result: TResult; metadata: TMeta }>(
        (resolve, reject) => {
          const item: ITransportItem<TMeta, unknown, TResult> = {
            message: props.message,
            metadata: props.metadata,
            route: props.route,
            // currently ignoring completion, because it's in memory!
            complete: () => undefined,
            sendReply: (result, metadata) =>
              Promise.resolve(resolve({ result, metadata })),
          }

          this._message$.next(item)
        },
      ),
      // return null on timeout
      new Promise<null>(res =>
        setTimeout(() => res(null), props.rpc.timeout),
      ),
    ]).then(x => {
      if (!x) {
        throw new RpcTimeoutError(props)
      }
      return x as { result: TResult; metadata: TMeta }
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
    this._message$.complete()
  }
}
