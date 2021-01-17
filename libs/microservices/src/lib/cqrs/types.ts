import { MessageMetadata } from '@cheep/transport'
import { CqrsType } from './constants'

/** A function which can be called over RPC */
export type Handler = (...args: unknown[]) => Promise<unknown>

// eslint-disable-next-line @typescript-eslint/ban-types
export type ShallowHandlerMap<T = Handler | object> =
  | T
  | Record<string, T>
  | Record<string, Record<string, T>>
  | Record<string, Record<string, Record<string, T>>>
  | Record<string, Record<string, Record<string, Record<string, T>>>>
  | Record<
      string,
      Record<
        string,
        Record<string, Record<string, Record<string, T>>>
      >
    >

export type QueryMap = ShallowHandlerMap
export type CommandMap = ShallowHandlerMap

export type HandlerArg = Handler | Array<Handler> | ShallowHandlerMap

export interface RpcMetadata extends MessageMetadata {
  error?: Error | unknown
  /** IsoDateTime string */
  callTime: string
  /** IsoDateTime string */
  replyTime?: string | undefined
}

export interface RouteKey {
  busType: CqrsType
  moduleName: string
  functionName: string | string[]
}

export interface RpcOptions {
  /** **(millis)** to wait for an RPC call to throw a timeout error */
  timeout: number
}

export interface CqrsApi<
  TNamespace extends string,
  TQueryHandler extends QueryMap,
  TCommandHandler extends CommandMap
> {
  [CqrsType.Query]: TQueryHandler

  [CqrsType.Command]: TCommandHandler
  namespace: TNamespace
}
export type GenericCqrsApi = CqrsApi<string, QueryMap, CommandMap>

export type ClientApi<
  TApi extends CqrsApi<string, QueryMap, CommandMap>
> = {
  [CqrsType.Query]: {
    [key in TApi['namespace']]: TApi extends CqrsApi<
      key,
      infer Query,
      CommandMap
    >
      ? Query
      : never
  }

  [CqrsType.Command]: {
    [key in TApi['namespace']]: TApi extends CqrsApi<
      key,
      QueryMap,
      infer Command
    >
      ? Command
      : never
  }
}
