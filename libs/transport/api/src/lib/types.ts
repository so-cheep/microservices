export type TransportHandler<TApi, TMetadata> = {
  on: FunctionalHandlerFactory<TApi, TMetadata>
}

// Commands & Queries
// type CallWithMetadata<T> = {
//   [P in keyof T]: T[P] extends infer TValue ? TValue : never
// }

// Events
export type FunctionalHandlerFactory<TApi, TMetadata> = <
  TEventSelection extends EventMapReturn<unknown, string[]>,
  TPayload = TEventSelection extends EventMapReturn<infer R, string[]>
    ? R
    : never
>(
  event: (event: EventMapToReturns<TApi>) => TEventSelection,
  handler: (
    api: TApi,
    payload: TPayload,
    metadata: TMetadata,
  ) => unknown | void | Promise<unknown | void>,
) => void

export type EventMapToReturns<
  TEventMap,
  TKey extends string[] = string[]
> = {
  [K in keyof TEventMap]: TEventMap[K] extends EventPublishFunction<
    infer R
  >
    ? EventMapReturn<R, [...TKey, K extends string ? K : string]>
    : EventMapToReturns<
        TEventMap[K],
        [...TKey, K extends string ? K : string]
      >
}

type EventPublishFunction<TPayload extends unknown> = (
  payload: TPayload,
) => void

type EventMapReturn<TPayload, TPath, TResult = void> = {
  payload: TPayload
  path: TPath
  result: TResult
}
