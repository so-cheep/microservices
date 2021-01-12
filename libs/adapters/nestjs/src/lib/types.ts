import type {
  CommandMap,
  EventMap,
  Handler,
  MicroserviceApi,
  QueryMap,
  ShallowHandlerMap,
} from '@cheep/microservices'
import type { Transport } from '@cheep/transport'

export interface CheepMicroservicesRootConfig {
  transport: Transport
}

export type GenericMicroserviceApi = MicroserviceApi<
  string,
  QueryMap,
  CommandMap,
  EventMap
>

export interface CheepMicroservicesModuleConfig<
  TModuleApi extends CheepNestApi<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    EventMap
  >,
  TRemoteApi extends GenericMicroserviceApi,
  TQueryHandlers extends
    | unknown[]
    | ShallowHandlerMap = TModuleApi['_queryHandlers'],
  TCommandHandlers extends
    | unknown[]
    | ShallowHandlerMap = TModuleApi['_commandHandlers']
> {
  moduleName: TModuleApi['namespace'] extends never
    ? string
    : TModuleApi['namespace']
  queryHandlers: TQueryHandlers extends unknown[]
    ? Classify<TQueryHandlers> extends never
      ? undefined | []
      : Classify<TQueryHandlers>
    : TQueryHandlers
  commandHandlers: TCommandHandlers extends unknown[]
    ? Classify<TCommandHandlers> extends never
      ? undefined | []
      : Classify<TCommandHandlers>
    : TCommandHandlers
  listenEventsFrom?: TRemoteApi['namespace'][] | []
}

export type CheepNestApi<
  TNamespace extends string,
  TQueryHandlers extends ShallowHandlerMap | unknown[],
  TCommandHandlers extends ShallowHandlerMap | unknown[],
  TEvents extends EventMap
> = {
  _queryHandlers: TQueryHandlers
  _commandHandlers: TCommandHandlers
} & MicroserviceApi<
  TNamespace,
  HandlersIn<TQueryHandlers>,
  HandlersIn<TCommandHandlers>,
  TEvents
>

type HandlerKeysOf<T> = {
  [K in keyof T]: T[K] extends Handler | ShallowHandlerMap ? K : never
}[keyof T]

// conditional type to either unwrap and intersect array of handlers, or return handler map
type HandlersIn<T> = T extends unknown[]
  ? Pick<
      ArrayToIntersection<T>,
      HandlerKeysOf<ArrayToIntersection<T>>
    >
  : T extends ShallowHandlerMap
  ? T
  : never

export type ClassOf<T> = { new (...args: unknown[]): T }

//utility types
type ArrayToIntersection<T extends unknown[]> = UnionToIntersection<
  ArrayToUnion<T>
>
type ArrayToUnion<A extends Array<unknown>> = A[number]
type UnionToIntersection<U> = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  U extends any
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never

type Classify<T extends Array<unknown>> = {
  [K in keyof T]: ClassOf<T[K]>
}
