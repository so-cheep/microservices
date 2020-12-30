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
