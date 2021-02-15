export type Api = Record<string, unknown>

export type MetadataOperator = '$'
export type RouteVariableOperator = '_'
export type CheepOperators = MetadataOperator | RouteVariableOperator

export const MetadataOperator: MetadataOperator = '$'
export const RouteVariableOperator: RouteVariableOperator = '_'

export type TransportHandler<TApi extends Api, TMetadata> = {
  on: FunctionalHandlerFactory<TApi, TMetadata>
}

// Commands & Queries
// type CallWithMetadata<T> = {
//   [P in keyof T]: T[P] extends infer TValue ? TValue : never
// }

// Events
export type FunctionalHandlerFactory<TApi extends Api, TMetadata> = <
  TEventSelection extends RouteMapReturn<unknown[], string[]>,
  TPayload extends Array<
    unknown
  > = TEventSelection extends RouteMapReturn<infer R, string[]>
    ? R extends Array<unknown>
      ? R
      : never
    : never
>(
  route: (event: RouteMap<TApi>) => TEventSelection,
  handler: (
    api: CallableApi<TApi>,
    ...args: [...TPayload, TMetadata]
  ) => unknown | void | Promise<unknown | void>,
) => void

export type RouteMap<TRouteMap, TKey extends string[] = string[]> = {
  [K in keyof Omit<
    TRouteMap,
    MetadataOperator
  >]: K extends RouteVariableOperator
    ? TRouteMap[K] extends (...args: infer A) => infer InnerMap
      ? // TODO: support strings or tuples of string
        (
          ...args: A
        ) => CombineWithoutMetadataOperator<InnerMap, [...TKey, K]>
      : never
    : // K does not extend RouteVariableOperator
    TRouteMap[K] extends Api
    ? // handle case of $ operator, need to merge the return of the $ function with other keys
      CombineWithoutMetadataOperator<
        TRouteMap[K],
        [...TKey, K extends string ? K : string]
      >
    : TRouteMap[K] extends (...args: infer P) => unknown
    ? RouteMapReturn<P, [...TKey, K extends string ? K : string]>
    : never
}

export type CombineWithoutMetadataOperator<
  TRouteMap,
  TKey extends string[]
> = TRouteMap extends {
  [MetadataOperator]: (...args: unknown[]) => infer M
}
  ? RouteMap<M, TKey> &
      RouteMap<Omit<TRouteMap, MetadataOperator>, TKey>
  : RouteMap<TRouteMap, TKey>

/**
 * ensures that the callable api type is awaitable, even for non-promise based handlers, because the transport always adds async
 *
 * also adds exceptions for the operator types
 */
export type CallableApi<TApi extends Api> = {
  [K in keyof TApi]: TApi[K] extends Record<string, unknown>
    ? CallableApi<TApi[K]>
    : K extends CheepOperators
    ? TApi[K]
    : EnsurePromise<TApi[K]>
}

type EnsurePromise<T> = T extends (...args: infer A) => infer P
  ? P extends Promise<unknown>
    ? (...args: A) => P
    : (...args: A) => Promise<P>
  : never

type UnwrapPromise<T> = T extends Promise<infer P> ? P : T

type RoutePublishFunction<TPayload extends unknown> = (
  payload: TPayload,
) => void

export type RouteMapReturn<
  TPayload extends unknown[],
  TPath,
  TResult = void
> = {
  payload: TPayload
  path: TPath
  result: TResult
}
