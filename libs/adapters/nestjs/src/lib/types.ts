import type {
  TransportHandlerOptions,
  Api,
  ApiWithExecutableKeys,
} from '@cheep/transport-api'
import type { Transport } from '@cheep/transport'
import type { DeepPartial, ReplaceLeaves } from '@cheep/utils'

export interface CheepMicroservicesRootConfig
  extends TransportHandlerOptions {
  transport: Transport
}

export type CheepMicroservicesModuleConfig<
  TModuleApi extends ApiWithExecutableKeys,
  TRemoteApi extends ApiWithExecutableKeys
> = {
  /**
   * this object represents all of the handlers which will be registered with the transport
   */
  handlers: DeepPartial<
    ClassifyRecord<TModuleApi['api'] & TRemoteApi['api']>
  >
  /**
   * this map estabilshes subscriptions to partial or full routes which may be subscribed to dynamically after setup.
   *
   * If a route does not appear in this map, it will be possible to subscribe using the event service,
   * however events will not be delivered.
   */
  listenEvery: DeepPartial<
    ReplaceLeaves<TModuleApi['api'] & TRemoteApi['api'], boolean>
  >
} & TransportHandlerOptions

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
