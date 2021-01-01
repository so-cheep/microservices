import type { MessageMetadata } from '@cheep/transport'
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
  TEvents extends EventMap
> {
  namespace: TNamespace
  events: TEvents
}

export type EventPublisher<
  TEventApi extends EventApi<string, EventMap>
> = Record<TEventApi['namespace'], TEventApi['events']> &
  ((...events: unknown[]) => void)

export abstract class EventBase {}

export type EventWithMetadata<
  TEventPayload = unknown,
  TEventPath extends string[] = string[],
  TMetadata extends MessageMetadata = MessageMetadata
> = {
  type: TEventPath
  payload: TEventPayload
  metadata: TMetadata
}

type EventsFromMap<
  TEventMap extends EventMap,
  TKey extends string[]
> = ValuesOf<
  {
    [K in keyof TEventMap]: TEventMap[K] extends EventPublishFunction<
      infer R
    >
      ? EventWithMetadata<R, [...TKey, K extends string ? K : string]>
      : TEventMap[K] extends EventMap
      ? EventsFromMap<
          TEventMap[K],
          [...TKey, K extends string ? K : string]
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
      ? EventsFromMap<Events, [key]>
      : never
  }
>

type ValuesOf<T> = T[keyof T]

// HANDLER TYPES

export interface EventHandler<
  TEventApi extends EventApi<string, EventMap>
> {
  on: FunctionalEventHandlerFactory<TEventApi>
  handleClass: InheritanceEventHandlerFactory
  event$: Observable<AllEventsMap<TEventApi>>
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
  TEvent extends { new (...args: unknown[]): unknown },
  TPayload = TEvent extends { new (...args: unknown[]): infer R }
    ? R
    : never
>(
  event: TEvent | TEvent[],
  handler: (payload: TPayload) => void | Promise<void>,
) => void
