import { InvalidRpcPathError, Transport } from '../../../../types/src'
import { encodeRpc } from '../utils/encodeRpc'
import { EventRouteKey } from './constants'
import { EventApi, EventMap, EventPublisher } from './types'
import { getInstanceEventRoute } from './utils/getInstanceEventRoute'

export function getEventPublisher<
  TApi extends EventApi<string, EventMap>
>(transport: Transport): EventPublisher<TApi> {
  return buildRecursiveProxy(transport, [EventRouteKey])
}

function buildRecursiveProxy(transport: Transport, path: string[]) {
  return new Proxy(() => undefined, {
    get(_, prop) {
      return buildRecursiveProxy(transport, [...path, String(prop)])
    },
    apply(_, __, args: unknown[]) {
      // path should have EventRouteKey + Module Name + function name to do proxy route key
      if (path.length < 2) {
        // might be a publish of array of class events!
        if (args.every(getInstanceEventRoute)) {
          // yep, it's class events
          args.forEach(arg =>
            publish(transport, [arg], getInstanceEventRoute(arg)),
          )
        } else {
          // nope, not class events, so its a bad path!
          throw new InvalidRpcPathError(path)
        }
      } else {
        // normal proxy object call here
        publish(transport, args, path.join('.'))
      }
    },
  })
}

function publish(
  transport: Transport,
  args: unknown[],
  path: string,
) {
  transport.publish<void>({
    message: encodeRpc(...args),
    metadata: {} as never,
    route: path,
  })
}
