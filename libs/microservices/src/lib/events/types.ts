import type { MessageMetadata, Referrer } from '@cheep/transport'
import type { Observable } from 'rxjs'

export type EventPublishFunction<TPayload extends unknown> = (
  payload: TPayload,
) => void

export type EventMap<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TEventMap extends EventMap<TEventMap> = any
> = Record<string, TEventMap | EventPublishFunction<unknown>>

export interface EventApi<
  TNamespace extends string,
  TEvents extends EventMap,
  TMeta extends MessageMetadata = MessageMetadata
> {
  namespace: TNamespace
  events: TEvents
  metadata: TMeta
}

export type EventPublisher<
  TEventApi extends EventApi<string, EventMap>
> = Record<
  TEventApi['namespace'],
  EventPublishersWithMeta<TEventApi['events'], TEventApi['metadata']>
>

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

export abstract class EventBase {}

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

/** extracts all possible events from an eventApi as a union.  */
export type AllEventsMap<
  TEventApi extends EventApi<string, EventMap>
> = ValuesOf<
  {
    [key in TEventApi['namespace']]: TEventApi extends EventApi<
      key,
      infer Events
    >
      ? EventsFromMap<Events, [key], TEventApi['metadata']>
      : never
  }
>

type ValuesOf<T> = T[keyof T]

// HANDLER TYPES

export interface EventHandler<
  TEventApi extends EventApi<string, EventMap>
> {
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
  handler: (
    payload: TPayload,
    referrer: Referrer<TEventApi['metadata']>,
  ) => void | Promise<void>,
) => void

type FilteredEventObservable<
  TEventApi extends EventApi<string, EventMap>
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
  event?: (event: EventSelector<TEventApi>) => TEventSelection[],
) => Observable<
  EventWithMetadata<TPayload, TPath, TEventApi['metadata']>
>
