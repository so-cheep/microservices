export type Api = Record<string, unknown>

export type MetadataOperator = '$'
export type RouteVariableOperator = '_'
export type CheepOperators = MetadataOperator | RouteVariableOperator

export const MetadataOperator: MetadataOperator = '$'
export const RouteVariableOperator: RouteVariableOperator = '_'

export type TransportHandler<TApi, TMetadata> = {
  on: FunctionalHandlerFactory<TApi, TMetadata>
}

// Commands & Queries
// type CallWithMetadata<T> = {
//   [P in keyof T]: T[P] extends infer TValue ? TValue : never
// }

// Events
export type FunctionalHandlerFactory<TApi, TMetadata> = <
  TEventSelection extends RouteMapReturn<unknown, string[]>,
  TPayload = TEventSelection extends RouteMapReturn<infer R, string[]>
    ? R
    : never
>(
  route: (event: RouteMap<TApi>) => TEventSelection,
  handler: (
    api: TApi,
    payload: TPayload,
    metadata: TMetadata,
  ) => unknown | void | Promise<unknown | void>,
) => void

export type RouteMap<TRouteMap, TKey extends string[] = string[]> = {
  [K in keyof Omit<
    TRouteMap,
    MetadataOperator
  >]: K extends RouteVariableOperator
    ? // TODO: support strings or tuples of string
      (
        ...args: TRouteMap[K] extends (...args: infer A) => unknown
          ? A
          : string[]
      ) => RouteMap<
        TRouteMap[K] extends (...args) => infer R ? R : never,
        [...TKey, K extends string ? K : string]
      >
    : TRouteMap[K] extends RoutePublishFunction<infer R>
    ? RouteMapReturn<R, [...TKey, K extends string ? K : string]>
    : // handle case of $ operator, need to merge the return of the $ function with other keys
    TRouteMap[K] extends {
        [MetadataOperator]: (...args: unknown[]) => infer M
      }
    ? RouteMap<M, TKey> &
        RouteMap<
          TRouteMap[K],
          [...TKey, K extends string ? K : string]
        >
    : RouteMap<TRouteMap[K], [...TKey, K extends string ? K : string]>
}

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

type RoutePublishFunction<TPayload extends unknown> = (
  payload: TPayload,
) => void

type RouteMapReturn<TPayload, TPath, TResult = void> = {
  payload: TPayload
  path: TPath
  result: TResult
}
