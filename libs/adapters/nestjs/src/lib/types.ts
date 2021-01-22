import type {
  CommandMap,
  EventMap,
  Handler,
  MicroserviceApi,
  QueryMap,
  ShallowHandlerMap,
} from '@cheep/microservices'
import type { MessageMetadata, Transport } from '@cheep/transport'
import type { Type } from '@nestjs/common'

export interface CheepMicroservicesRootConfig {
  transport: Transport
}

export type GenericMicroserviceApi = MicroserviceApi<
  string,
  QueryMap,
  CommandMap,
  EventMap
>

export type ShallowInjectableHandlerMap = ShallowHandlerMap<Type>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericNestApi = CheepNestApi<string, any, any, EventMap>

export type CheepMicroservicesModuleConfig<
  TModuleApi extends GenericNestApi,
  TRemoteApi extends GenericMicroserviceApi,
  TQueryHandlers extends ShallowHandlerMap = TModuleApi['queryHandlers'],
  TCommandHandlers extends ShallowHandlerMap = TModuleApi['commandHandlers']
> = {
  moduleName: TModuleApi['namespace'] extends never | undefined
    ? string
    : TModuleApi['namespace']
  /**
   * This should match the type of QueryHandlers passed to the module's CheepNestApi type.
   * Be sure that any NestJS providers referenced here are also in the providers array for your module
   *
   * **If this value is simply one handler**, we will not throw an error if you fail to provide it,
   * as that is indistinguishable from a module with no handlers at runtime
   */
  queryHandlers: TModuleApi['queryHandlers'] extends never
    ? null
    : ClassifyRecord<TQueryHandlers> | ClassOf<TQueryHandlers>
  /**
   * This should match the type of CommandHandlers passed to the module's CheepNestApi type.
   * Be sure that any NestJS providers referenced here are also in the providers array for your module
   *
   * **If this value is simply one handler**, we will not throw an error if you fail to provide it,
   * as that is indistinguishable from a module with no handlers at runtime
   */
  commandHandlers: TModuleApi['commandHandlers'] extends never
    ? null
    : ClassifyRecord<TCommandHandlers> | ClassOf<TCommandHandlers>
  /**
   * The remote modules whose events will be available to this module.
   */
  listenEventsFrom: TRemoteApi['namespace'][] | []
}

export type CheepNestApi<
  TNamespace extends string,
  TQueryHandlers extends ShallowHandlerMap,
  TCommandHandlers extends ShallowHandlerMap,
  TEvents extends EventMap,
  TMeta extends MessageMetadata = MessageMetadata
> = {
  queryHandlers: TQueryHandlers
  commandHandlers: TCommandHandlers
} & MicroserviceApi<
  TNamespace,
  TQueryHandlers,
  TCommandHandlers,
  TEvents,
  TMeta
>

export type ClassOf<T> = { new (...args: unknown[]): T }

// eslint-disable-next-line @typescript-eslint/ban-types
type ClassifyRecord<T extends Record<string, unknown> | object> = {
  [K in keyof T]: T[K] extends Record<string, Handler>
    ? ClassOf<T[K]>
    : // eslint-disable-next-line @typescript-eslint/ban-types
    T[K] extends Record<string, unknown> | object
    ? ClassifyRecord<T[K]> | ClassOf<T[K]>
    : never
}

//#region  simple classify test

type Test = { A: { B: { C: Handler } } }

type Classifyed = ClassifyRecord<Test>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type check = Classifyed extends { A: { B: ClassOf<{ C: Handler }> } }
  ? 'pass'
  : 'fail'
//#endregion

//#region  OLD TYPES THAT MIGHT BE USEFUL IN THE FUTURE
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
// type ClassifyArray<T extends Array<unknown>> = {
//   [K in keyof T]: ClassOf<T[K]>
// }
//#endregion
