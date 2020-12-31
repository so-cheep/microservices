import type {
  CommandMap,
  CqrsType,
  EventMap,
  Handler,
  MicroserviceApi,
  QueryMap,
} from '@cheep/microservices'
import type { Transport } from '@cheep/transport/shared'
import { Type, Abstract } from '@nestjs/common'

export interface CheepMicroservicesRootConfig {
  transport: Transport
}

export interface CheepMicroservicesModuleConfig<
  TModuleApi extends CheepNestApi<
    string,
    unknown[],
    unknown[],
    EventMap
  >,
  TRemoteApi extends MicroserviceApi<
    string,
    QueryMap,
    CommandMap,
    EventMap
  >,
  TQueryHandlers extends unknown[] = TModuleApi['_queryHandlers'],
  TCommandHandlers extends unknown[] = TModuleApi['_commandHandlers']
> {
  moduleName: TModuleApi['namespace'] extends never
    ? string
    : TModuleApi['namespace']
  queryHandlers: Classify<TQueryHandlers> extends never
    ? undefined | []
    : Classify<TQueryHandlers>
  commandHandlers: Classify<TCommandHandlers> extends never
    ? undefined | []
    : Classify<TCommandHandlers>
  listenEventsFrom?: TRemoteApi['namespace'][] | []
}

export type CheepNestApi<
  TNamespace extends string,
  TQueryHandlers extends unknown[],
  TCommandHandlers extends unknown[],
  TEvents extends EventMap
> = {
  _queryHandlers: TQueryHandlers
  _commandHandlers: TCommandHandlers
} & MicroserviceApi<
  TNamespace,
  HandlersIn<UnionToIntersection<ArrayToUnion<TQueryHandlers>>>,
  HandlersIn<UnionToIntersection<ArrayToUnion<TCommandHandlers>>>,
  TEvents
>

type HandlerKeysOf<T> = {
  [K in keyof T]: T[K] extends Handler ? K : never
}[keyof T]

type HandlersIn<T> = Pick<T, HandlerKeysOf<T>>

type Class<T> = { new (...args: unknown[]): T }

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
  [K in keyof T]: Class<T[K]>
}
