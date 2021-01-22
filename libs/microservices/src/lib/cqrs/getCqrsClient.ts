import {
  Transport,
  MetdataToken,
  MessageMetadata,
} from '@cheep/transport'
import { InvalidRpcPathError } from '../errors/invalidRpcPath.error'
import { constructRouteKey } from '../utils/constructRouteKey'
import { ClientApi, GenericCqrsApi, RpcOptions } from './types'

export function getCqrsClient<Api extends GenericCqrsApi>(
  transport: Transport,
  options?: RpcOptions,
): ClientApi<Api> {
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

      // determine if we recieved metadata as the last arg
      const lastArg = args.slice(-1).pop()
      const isLastArgMetadata =
        lastArg && Reflect.hasOwnMetadata(MetdataToken, lastArg)
      const referrerMetadata = isLastArgMetadata
        ? (lastArg as MessageMetadata)
        : undefined

      const metadata = transport.mergeMetadata({
        route: routeKey,
        message: args,
        currentMetadata: { callTime: new Date().toISOString() },
        referrerMetadata,
      })
      return transport.execute({
        message: isLastArgMetadata ? args.slice(0, -1) : args,
        metadata,
        route: routeKey,
      })
    },
  })
}
