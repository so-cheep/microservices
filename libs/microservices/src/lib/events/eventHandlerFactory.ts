import { Transport } from '@cheep/transport'
import { Observable } from 'rxjs'
import { filter, map, mergeMap, share } from 'rxjs/operators'
import { constructRouteKey } from '../utils/constructRouteKey'
import { decodeRpc } from '../utils/decodeRpc'
import { EventRouteKey } from './constants'
import {
  AllEventsMap,
  EventApi,
  EventHandler,
  EventMap,
} from './types'
import { getClassEventRoute } from './utils/getClassEventRoute'

/**
 * Call this function to establish an event handler in a module.
 *
 * **Should be called once per module** because it creates a constraint of one acknowledged handler per event type
 *
 * Returns an object with functional methods to handle events with acknowledgement,
 * as well as an observable of events which can be used for lossy event handling
 *
 * @param transport the transport to use
 * @param listenModules the array of module names to subscribe events from, limited to the provided API names
 */
export function handleEvents<
  TEventApi extends EventApi<string, EventMap>
>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transport: Transport,
  listenModules: TEventApi['namespace'][],
): EventHandler<TEventApi> {
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

  const event$ = transport.message$.pipe(
    filter(item => item.route.startsWith(EventRouteKey)),
    map(item => ({
      metadata: item.metadata,
      // the event function type requires a single arg, so this is safe
      payload: decodeRpc(item.message).shift(),
      // split by `.` then remove the first, which is the EventRouteKey (Event)
      type: item.route.split('.').slice(1),
    })),
    share(),
  )

  transport.listenPatterns(
    listenModules.map(module => `${EventRouteKey}.${module}.`),
  )

  return {
    event$: (event$ as unknown) as Observable<
      AllEventsMap<TEventApi>
    >,
    on: (eventPick, handler) => {
      // this allows the callback pick of events using the proxy.
      // BUT the proxy has a liar's type, so we need to call the returned proxy to get the path
      const event = (eventPick(
        generateEventHandlerProxy([EventRouteKey]),
      ) as unknown) as () => string

      handlerMap.set(event(), handler)
    },
    handleClass: (eventPick, handler) => {
      // eventPick is a constructor
      const keys = Array.isArray(eventPick)
        ? eventPick.map(getClassEventRoute)
        : [getClassEventRoute(eventPick)]
      keys.forEach(key =>
        handlerMap.set(
          constructRouteKey([EventRouteKey, ...key]),
          handler,
        ),
      )
    },
  }
}

function generateEventHandlerProxy(path: string[]) {
  return new Proxy(() => undefined, {
    get: (_, prop) => {
      return generateEventHandlerProxy([...path, String(prop)])
    },
    apply: () => constructRouteKey(path),
  })
}
