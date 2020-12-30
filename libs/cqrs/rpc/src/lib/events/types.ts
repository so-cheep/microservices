export type EventPublishFunction<TPayload extends unknown> = (
  payload: TPayload,
) => void

export interface EventMap {
  [key: string]: EventMap | EventPublishFunction<unknown>
}

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
