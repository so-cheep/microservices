import { Transport } from '@nx-cqrs/cqrs/types'
import { mergeMap } from 'rxjs/operators'
import { decodeRpc } from '../utils/decodeRpc'
import { EventRouteKey } from './constants'
import { EventApi, EventMap, EventPublishFunction } from './types'
import { getClassEventRoute } from './utils/getClassEventRoute'

export function handleEventsWithAck<
  TEventApi extends EventApi<string, EventMap>
>(
  transport: Transport<never, string>,
): {
  handleFunction: FunctionalEventHandlerFactory<TEventApi>
  handleClass: InheritanceEventHandlerFactory
} {
  const handlerMap = new Map<
    string,
    (...args: unknown[]) => void | Promise<void>
  >()

  transport.message$
    .pipe(
      mergeMap(
        async (item): Promise<[typeof item, boolean]> => {
          try {
            if (handlerMap.has(item.route)) {
              // route is handled
              const handler = handlerMap.get(item.route)
              const args = decodeRpc(item.message)

              // call handler, adding metadata as last arg
              await handler(...args, item.metadata)
            }

            return [item, true]
          } catch (err) {
            return [item, false]
          }
        },
      ),
    )
    .subscribe(([item, result]) => {
      try {
        item.complete(result)
      } catch {
        //
      }
    })

  return {
    handleFunction: (eventPick, handler) => {
      // this allows the callback pick of events using the proxy.
      // BUT the proxy has a liar's type, so we need to call the returned proxy to get the path
      const event = (eventPick(
        generateEventHandlerProxy([EventRouteKey]),
      ) as unknown) as () => string

      handlerMap.set(event(), handler)

      // make sure to tell the transport about this binding
      transport.listenPatterns([event()])
    },
    handleClass: (eventPick, handler) => {
      // eventPick is a constructor
      const keys = Array.isArray(eventPick)
        ? eventPick.map(getClassEventRoute)
        : [getClassEventRoute(eventPick)]
      keys.forEach(key =>
        handlerMap.set(`${EventRouteKey}.${key}`, handler),
      )

      // make sure to tell the transport about the bindings
      transport.listenPatterns(keys)
    },
  }
}

function generateEventHandlerProxy(path: string[]) {
  return new Proxy(() => undefined, {
    get: (_, prop) => {
      return generateEventHandlerProxy([...path, String(prop)])
    },
    apply: () => path.join('.'),
  })
}

type EventMapReturn<TPayload, TPath> = {
  payload: TPayload
  path: TPath
}
type EventMapToReturns<
  TEventMap extends EventMap,
  TKey extends string[]
> = {
  [K in keyof TEventMap]: TEventMap[K] extends EventPublishFunction<
    infer R
  >
    ? EventMapReturn<R, [...TKey, K extends string ? K : string]>
    : TEventMap[K] extends EventMap
    ? EventMapToReturns<
        TEventMap[K],
        [...TKey, K extends string ? K : string]
      >
    : unknown
}

type EventSelector<TEventApi extends EventApi<string, EventMap>> = {
  [key in TEventApi['namespace']]: TEventApi extends EventApi<
    key,
    infer Events
  >
    ? EventMapToReturns<Events, [key]>
    : never
}

type FunctionalEventHandlerFactory<
  TEventApi extends EventApi<string, EventMap>
> = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TEventSelection extends EventMapReturn<unknown, string[]>,
  TPayload = TEventSelection extends EventMapReturn<infer R, string[]>
    ? R
    : never
  // TODO: this is for handling partial event matches, not supported yet
  // : TEventSelection extends EventMapToReturns<EventMap, infer K>
  // ? TEventSelection
  // : 'WOOT'
>(
  event: (event: EventSelector<TEventApi>) => TEventSelection,
  handler: (payload: TPayload) => void | Promise<void>,
) => void

type InheritanceEventHandlerFactory = <
  TEvent extends { new (): unknown },
  TPayload = TEvent extends { new (): infer R } ? R : never
>(
  event: TEvent | TEvent[],
  handler: (payload: TPayload) => void | Promise<void>,
) => void
