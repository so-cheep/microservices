import { MessageMetadata } from '@nx-cqrs/cqrs/types'
import { CqrsType } from './constants'
import { EventMap } from './events/types'

/** A function which can be called over RPC */
export type Handler = (...args: unknown[]) => Promise<unknown>

/** An object  */
export interface HandlerMap {
  [key: string]: Handler | HandlerMap
}

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

interface Handlers<
  TNamespace extends string,
  TQueryHandler,
  TCommandHandler
> {
  [CqrsType.Query]: Record<TNamespace, TQueryHandler>

  [CqrsType.Command]: Record<TNamespace, TCommandHandler>
}
export interface CqrsApi<
  TNamespace extends string,
  TQueryHandler extends HandlerMap,
  TCommandHandler extends HandlerMap
> {
  [CqrsType.Query]: TQueryHandler

  [CqrsType.Command]: TCommandHandler
  namespace: TNamespace
}

export type ClientApi<
  Api extends CqrsApi<string, HandlerMap, HandlerMap>
> = Handlers<
  Api['namespace'],
  Api[CqrsType.Query],
  Api[CqrsType.Command]
>

export interface MicroserviceApi<
  TNamespace extends string,
  TQueryHandler extends HandlerMap,
  TCommandHandler extends HandlerMap,
  TEvents extends EventMap
> {
  namespace: TNamespace
  [CqrsType.Command]: TCommandHandler
  [CqrsType.Query]: TQueryHandler
  events: TEvents
}
