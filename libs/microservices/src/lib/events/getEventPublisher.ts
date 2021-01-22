import {
  MessageMetadata,
  MetdataToken,
  Transport,
} from '@cheep/transport'
import { InvalidRpcPathError } from '../errors/invalidRpcPath.error'
import { constructRouteKey } from '../utils/constructRouteKey'

import { EventRouteKey } from './constants'
import { EventApi, EventMap, EventPublisher } from './types'

export function getEventPublisher<
  TApi extends EventApi<string, EventMap>
>(transport: Transport): EventPublisher<TApi> {
  return buildRecursiveProxy(transport, [EventRouteKey])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRecursiveProxy(transport: Transport, path: string[]) {
  return new Proxy(() => undefined, {
    get(_, prop) {
      return buildRecursiveProxy(transport, [...path, String(prop)])
    },
    apply(_, __, args: unknown[]) {
      // path should have EventRouteKey + Module Name + function name to do proxy route key
      if (path.length < 2) {
        throw new InvalidRpcPathError(path)
      } else {
        const route = constructRouteKey(path)

        // determine if we recieved metadata as the last arg
        const lastArg = args.slice(-1).pop()
        const isLastArgMetadata =
          lastArg && Reflect.hasOwnMetadata(MetdataToken, lastArg)

        const referrerMetadata = isLastArgMetadata
          ? (lastArg as MessageMetadata)
          : undefined

        const metadata = transport.mergeMetadata({
          route,
          message: args,
          currentMetadata: { callTime: new Date().toISOString() },
          referrerMetadata,
        })

        transport.publish({
          message: isLastArgMetadata ? args.slice(0, -1) : args,
          metadata,
          route,
        })
      }
    },
  })
}
