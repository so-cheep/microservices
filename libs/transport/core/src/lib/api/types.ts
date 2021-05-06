import type { MessageMetadata, Referrer } from '../transport'

export type Api = Record<string, unknown>

export type MetadataOperator = '$'
export type RouteVariableOperator = '_'
export type CheepOperators = MetadataOperator | RouteVariableOperator

export const MetadataOperator: MetadataOperator = '$'
export const RouteVariableOperator: RouteVariableOperator = '_'
export const ReferenceApi = '_ReferenceApi'

export type TransportHandler<
  TApiWithKeys extends ApiWithExecutableKeys,
  TMetadata
> = {
  on: FunctionalHandlerFactory<TApiWithKeys, TMetadata>
}

// Events
export type FunctionalHandlerFactory<
  TApiWithKeys extends ApiWithExecutableKeys,
  TMetadata
> = <
  TEventSelection extends RouteMapReturn<
    unknown[],
    string[],
    unknown
  >,
  TPayload extends [
    Array<unknown>,
    unknown,
  ] = TEventSelection extends RouteMapReturn<
    infer R,
    string[],
    infer TResult
  >
    ? [R extends Array<unknown> ? R : never, TResult]
    : [[], never]
>(
  route: (event: RouteMap<TApiWithKeys['api']>) => TEventSelection,
  handler: (
    api: TransportApi<
      TApiWithKeys['api'],
      TApiWithKeys['executableKeys']
    >,
    ...args: [...TPayload[0], TMetadata]
  ) =>
    | ExtractPromiseValue<TEventSelection['result']>
    | Promise<ExtractPromiseValue<TEventSelection['result']>>,
) => () => void

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
    : TRouteMap[K] extends (...args: infer P) => infer Result
    ? RouteMapReturn<
        P,
        [...TKey, K extends string ? K : string],
        Result
      >
    : CombineWithoutMetadataOperator<
        TRouteMap[K],
        [...TKey, K extends string ? K : string]
      >
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
export type ExecutableApi<TApi> = {
  [K in keyof TApi]: TApi[K] extends Record<string, unknown>
    ? ExecutableApi<TApi[K]>
    : K extends CheepOperators
    ? TApi[K] extends (...args: infer TArgs) => infer TResult
      ? (...args: TArgs) => ExecutableApi<TResult>
      : number
    : // add catch here if we get never from ensure promise, assume it's a class in the api definition, or something else we should be stepping into
    EnsurePromise<TApi[K]> extends never
    ? ExecutableApi<TApi[K]>
    : EnsurePromise<TApi[K]>
}

export type PublishableApi<TApi> = {
  [K in keyof TApi]: TApi[K] extends Api
    ? PublishableApi<TApi[K]>
    : K extends CheepOperators
    ? TApi[K] extends (...args: infer TArgs) => infer TResult
      ? (...args: TArgs) => PublishableApi<TResult>
      : number
    : // add catch here if we get never from ensure promise, assume it's a class in the api definition, or something else we should be stepping into
    EnsurePromiseVoid<TApi[K]> extends never
    ? TApi[K]
    : EnsurePromiseVoid<TApi[K]>
}

type EnsurePromise<T> = T extends (...args: infer A) => infer P
  ? P extends Promise<unknown>
    ? (...args: A) => P
    : (...args: A) => Promise<P>
  : never

// type EnsurePromiseOrPlain<T> = T extends (...args: infer A) => infer P
//   ? P extends Promise<unknown>
//     ? (...args: A) => P
//     : (...args: A) => Promise<P>
//   : never

type ExtractPromiseValue<T> = T extends Promise<infer TPure>
  ? TPure
  : T

type EnsurePromiseVoid<T> = T extends (...args: infer A) => infer P
  ? P extends Promise<void>
    ? (...args: A) => P
    : (...args: A) => Promise<void>
  : never

export type RouteMapReturn<
  TPayload extends unknown[],
  TPath,
  TResult = unknown
> = {
  payload: TPayload
  path: TPath
  result: TResult
}

export type TransportApiOptions = {
  mode: 'PUBLISH' | 'EXECUTE'
  joinSymbol?: string
  metadata?: MessageMetadata
  referrer?: {
    route: string
    metadata: MessageMetadata
  }

  /** optional function to extract the referrer from the args array */
  argsProcessor?: (
    args: unknown[],
  ) => { payload: unknown; referrer?: Referrer }
}

export type TransportApi<
  TApi extends Api = Api,
  TExecutablePrefixes extends keyof TApi = keyof TApi
> = {
  execute: ExecutableApi<
    Pick<TApi, TExecutablePrefixes | (CheepOperators & keyof TApi)>
  >

  publish: PublishableApi<TApi>
}

export interface ApiWithExecutableKeys<
  TApi extends Api = Api,
  TExecutableKeys extends keyof TApi = string
> {
  api: TApi
  executableKeys: TExecutableKeys
}
