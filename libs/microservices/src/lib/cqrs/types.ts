import { MessageMetadata } from '@cheep/transport'
import { CqrsType } from './constants'

/** A function which can be called over RPC */
export type Handler = (...args: unknown[]) => Promise<unknown>

/** An object  */
export interface HandlerMap {
  [key: string]: Handler | HandlerMap
}

export type QueryMap =
  | HandlerMap
  | Record<string, Handler>
  | Record<string, Record<string, Handler>>
export type CommandMap =
  | HandlerMap
  | Record<string, Handler>
  | Record<string, Record<string, Handler>>

export type HandlerArg = Handler | Array<Handler> | HandlerMap

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

export type ClientApi<
  TApi extends CqrsApi<string, HandlerMap, HandlerMap>
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
