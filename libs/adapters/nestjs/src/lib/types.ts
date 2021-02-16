import type {
  CheepHandlerOptions,
  TransportApi,
} from '@cheep/transport-api'
import type { Transport } from '@cheep/transport'

export interface CheepMicroservicesRootConfig
  extends CheepHandlerOptions<string> {
  transport: Transport
}

export type CheepMicroservicesModuleConfig<
  TModuleApi extends TransportApi,
  TRemoteApi extends TransportApi
> = {
  /**
   * this object represents all of the handlers which will be registered with the transport
   */
  handlers: DeepPartial<ClassifyRecord<TModuleApi | TRemoteApi>>
  /**
   * this map estabilshes subscriptions to partial or full routes which may be subscribed to dynamically after setup.
   *
   * If a route does not appear in this map, it will be possible to subscribe using the event service,
   * however events will not be delivered.
   */
  listenEvery: DeepPartial<
    ReplaceLeaves<TModuleApi | TRemoteApi, boolean>
  >
} & CheepHandlerOptions<keyof (TModuleApi | TRemoteApi)>

//#region UTILITY TYPES

export type ClassOf<T> = { new (...args: unknown[]): T }

// eslint-disable-next-line @typescript-eslint/ban-types
type ClassifyRecord<T extends Record<string, unknown> | object> = {
  [K in keyof T]: T[K] extends Record<string, (...args) => unknown>
    ? ClassOf<T[K]>
    : // eslint-disable-next-line @typescript-eslint/ban-types
    T[K] extends Record<string, unknown> | object
    ? ClassifyRecord<T[K]> | ClassOf<T[K]>
    : never
}

//#region  simple classify test

type Test = { A: { B: { C: (...args) => unknown } } }

type Classifyed = ClassifyRecord<Test>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type check = Classifyed extends {
  A: { B: ClassOf<{ C: (...args) => unknown }> }
}
  ? 'pass'
  : 'fail'
//#endregion

/////////

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>
}

export type CollectPaths<
  T extends TransportApi,
  P extends string[] = []
> = {
  [K in keyof T]: T[K] extends TransportApi
    ? CollectPaths<T[K], [...P, K extends string ? K : string]>
    : [...P, K]
}[keyof T]

// replaces all leaves of an api with a different type, and making each node a union of the leaf as well, to allow for partial paths
export type ReplaceLeaves<TApi extends TransportApi, TLeaf> = {
  [K in keyof TApi]: TApi[K] extends TransportApi
    ? ReplaceLeaves<TApi[K], TLeaf> | TLeaf
    : TLeaf
}

//#endregion Utility Types

//#region  OLD TYPES THAT MIGHT BE USEFUL IN THE FUTURE

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

//#endregion
