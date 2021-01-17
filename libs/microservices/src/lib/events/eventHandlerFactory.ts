import { Transport, TransportCompactMessage } from '@cheep/transport'
import { Observable, Subject } from 'rxjs'
import { filter, map, share } from 'rxjs/operators'
import { constructRouteKey } from '../utils/constructRouteKey'
import { makeSafeArgs } from '../utils/makeSafeArgs'
import { EventRouteKey } from './constants'
import { EventApi, EventHandler, EventMap } from './types'

/**
 * Call this function to establish an event handler in a module.
 *
 * _repeat calls in the same module will have __minor__ performance impact
 *
 * Returns an object with functional method to handle events with acknowledgement,
 * as well as an observable of events which can be used for lossy event handling
 *
 * @param transport the transport to use
 * @param listenModules the array of module names to subscribe events from,
 * which limits the contents of the event observable stream
 */
export function handleEvents<
  TEventApi extends EventApi<string, EventMap>
>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transport: Transport,
  listenModules: TEventApi['namespace'][],
): EventHandler<TEventApi> {
  // set up the observable first
  const incoming$ = new Subject<TransportCompactMessage>()
  transport.onEvery(
    listenModules.map(module => `${EventRouteKey}.${module}`),
    x => incoming$.next(x),
  )
  // transform the observable and share the transformation
  const event$ = incoming$.pipe(
    filter(item => item.route.startsWith(EventRouteKey)),
    map(item => ({
      metadata: item.metadata,
      // the event function type requires a single arg, so this is safe
      payload: (item.message as unknown[]).slice(0, 1).shift(),
      // split by `.` then remove the first, which is the EventRouteKey (Event)
      type: item.route.split('.').slice(1),
      route: item.route,
    })),
    share(),
  )

  return {
    observe: eventPick => {
      // this allows the callback pick of events using the proxy.
      // BUT the proxy has a liar's type, so we need to call the returned proxy to get the path
      const events = eventPick
        ? ((eventPick(
            generateEventHandlerProxy([EventRouteKey]),
          ) as unknown) as (() => string)[])
        : [(): null => null]

      const keys = events.map(e => e()).filter(x => !!x)

      return event$.pipe(
        // protect for case where user provides no event pick filter by checking key length for 0, which should pass
        filter(e => keys.length === 0 || keys.includes(e.route)),
        share(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any
    },
    on: (eventPick, handler) => {
      // this allows the callback pick of events using the proxy.
      // BUT the proxy has a liar's type, so we need to call the returned proxy to get the path
      const event = (eventPick(
        generateEventHandlerProxy([EventRouteKey]),
      ) as unknown) as () => string

      transport.on(event(), async x => {
        // lying to typescript here, so we can squeeze metadata in
        const args = makeSafeArgs(x)
        return handler(...(args as Parameters<typeof handler>))
      })
    },
  }
}

// recursive function to generate a proxy, which is ultimately limited by typescript
function generateEventHandlerProxy(path: string[]) {
  return new Proxy(() => undefined, {
    get: (_, prop) => {
      return generateEventHandlerProxy([...path, String(prop)])
    },
    apply: () => constructRouteKey(path),
  })
}
