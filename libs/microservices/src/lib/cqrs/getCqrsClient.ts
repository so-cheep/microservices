import { Transport } from '@cheep/transport/shared'
import { constructRouteKey } from '../utils/constructRouteKey'
import { decodeRpc } from '../utils/decodeRpc'
import { encodeRpc } from '../utils/encodeRpc'
import {
  RpcMetadata,
  RpcOptions,
  HandlerMap,
  CqrsApi,
  ClientApi,
} from './types'
import { InvalidRpcPathError } from '../errors/invalidRpcPath.error'

export function getCqrsClient<
  Api extends CqrsApi<string, HandlerMap, HandlerMap>
>(
  transport: Transport<RpcMetadata>,
  options?: RpcOptions,
): ClientApi<Api> {
  return recursiveHandler(transport, options)
}

function recursiveHandler(
  transport: Transport<RpcMetadata>,
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
      return transport
        .publish<RpcMetadata>({
          message: encodeRpc(...args),
          metadata: { callTime: new Date().toISOString() },
          route: routeKey,
          rpc: {
            timeout: 5000,
            ...options,
            enabled: true,
          },
        })
        .then(result => {
          if (result.metadata?.error) {
            throw result.metadata.error
          }
          return decodeRpc(result?.result)[0]
        })
    },
  })
}
