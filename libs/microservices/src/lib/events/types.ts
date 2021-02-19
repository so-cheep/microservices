import type { MessageMetadata, Referrer } from '@cheep/transport'
import type { Api } from '@cheep/transport-api'
import type { Observable } from 'rxjs'

export type EventPublishFunction<TPayload extends unknown> = (
  payload: TPayload,
) => void

export type EventMap<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TEventMap extends EventMap<TEventMap> = any
> = Record<string, TEventMap | EventPublishFunction<unknown>>

export type EventApi = Api

// export type EventPublisher<
//   TEventApi extends TransportApi
// > = Record<
//   TEventApi['namespace'],
//   EventPublishersWithMeta<TEventApi['events'], TEventApi['metadata']>
// >

export type EventPublishersWithMeta<
  TEvents extends EventMap,
  TMeta extends MessageMetadata = MessageMetadata
> = {
  [k in keyof TEvents]: TEvents[k] extends (
    ...args: unknown[]
  ) => void
    ? (
        ...args: [...Parameters<TEvents[k]>, Referrer<TMeta>?]
      ) => Promise<void>
    : EventPublishersWithMeta<TEvents[k], TMeta>
}

export type EventWithMetadata<
  TEventPayload = unknown,
  TEventPath extends string[] = string[],
  TMetadata extends MessageMetadata = MessageMetadata
> = {
  type: TEventPath
  payload: TEventPayload
  metadata: TMetadata
  referrer: Referrer<TMetadata>
}

type EventsFromMap<
  TEventMap extends EventMap,
  TKey extends string[],
  TMeta extends MessageMetadata = MessageMetadata
> = ValuesOf<
  {
    [K in keyof TEventMap]: TEventMap[K] extends EventPublishFunction<
      infer R
    >
      ? EventWithMetadata<
          R,
          [...TKey, K extends string ? K : string],
          TMeta
        >
      : TEventMap[K] extends EventMap
      ? EventsFromMap<
          TEventMap[K],
          [...TKey, K extends string ? K : string],
          TMeta
        >
      : unknown
  }
>

type ValuesOf<T> = T[keyof T]

// HANDLER TYPES

export interface EventHandler<TEventApi extends TransportApi> {
  /** provide a reliable handler for a single event */
  on: FunctionalEventHandlerFactory<TEventApi>
  /** get an observable of events (with optional, type-safe filtering) */
  observe: FilteredEventObservable<TEventApi>

  /** @depreciated */
  // handleClass: InheritanceEventHandlerFactory
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

// type EventSelector<TEventApi extends TransportApi> = {
//   [key in TEventApi['namespace']]: TEventApi extends
//     key,
//     infer Events
//   >
//     ? EventMapToReturns<Events, [key]>
//     : never
// }

type FunctionalEventHandlerFactory<TEventApi extends TransportApi> = <
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
  event: (event: EventMapToReturns<TEventApi, []>) => TEventSelection,
  handler: (
    payload: TPayload,
    referrer: Referrer,
  ) => void | Promise<void>,
) => void

type FilteredEventObservable<
  TEventApi extends TransportApi,
  TMeta extends MessageMetadata = MessageMetadata
> = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TEventSelection extends EventMapReturn<unknown, string[]>,
  TPayload = TEventSelection extends EventMapReturn<infer R, string[]>
    ? R
    : never,
  TPath extends string[] = TEventSelection extends EventMapReturn<
    unknown,
    infer R
  >
    ? R
    : never
>(
  event?: (
    event: EventMapToReturns<TEventApi, []>,
  ) => TEventSelection[],
) => Observable<EventWithMetadata<TPayload, TPath, TMeta>>
