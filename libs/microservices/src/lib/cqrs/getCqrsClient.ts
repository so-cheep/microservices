import { Transport } from '@cheep/transport'
import { InvalidRpcPathError } from '../errors/invalidRpcPath.error'
import { constructRouteKey } from '../utils/constructRouteKey'
import { ClientApi, CqrsApi, HandlerMap, RpcOptions } from './types'

export function getCqrsClient<
  Api extends CqrsApi<string, HandlerMap, HandlerMap>
>(transport: Transport, options?: RpcOptions): ClientApi<Api> {
  return recursiveHandler(transport, options)
}

function recursiveHandler(
  transport: Transport,
  options?: RpcOptions,
  /** only needed internally, **DO NOT SET** */
  path: string[] = [],
) {
  // make array safe
  return new Proxy(() => undefined, {
    get: (_, propertyName) => {
      return recursiveHandler(
        transport,
        options,
        path.concat([String(propertyName)]),
      )
    },
    // eslint-disable-next-line @typescript-eslint/ban-types
    apply: (_, fn: Function, args: unknown[]) => {
      if (path.length < 3) {
        // if path doesn't have 3 segments, then we don't have [Bus, Module, Function(...)]
        throw new InvalidRpcPathError(path)
      }
      const routeKey = constructRouteKey(path)
      return transport.execute({
        message: args,
        metadata: { callTime: new Date().toISOString() },
        route: routeKey,
      })
    },
  })
}
