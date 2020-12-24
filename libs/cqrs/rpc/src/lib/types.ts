import { IMessageMetadata } from '@nx-cqrs/cqrs/types'
import { CqrsType } from './constants'

/** A function which can be called over RPC */
export type THandler = (...args: unknown[]) => Promise<unknown>

/** An object  */
export interface IHandlerMap {
  [key: string]: THandler | IHandlerMap
}

export type THandlerArg = THandler | Array<THandler> | IHandlerMap

export interface IRpcMetadata extends IMessageMetadata {
  error?: Error | unknown
  /** IsoDateTime string */
  callTime: string
  /** IsoDateTime string */
  replyTime?: string | undefined
}

export interface IRouteKey {
  busType: CqrsType
  functionName: string | string[]
}

export interface IRpcOptions {
  /** **(millis)** to wait for an RPC call to throw a timeout error */
  timeout: number
}
