import { ITransport } from '../../../../types/src'
import { CqrsType } from '../constants'
import { getClient } from '../getClient'
import { IHandlerMap, IRpcOptions } from '../types'

export function getCommandClient<HandlerMap extends IHandlerMap>(
  transport: ITransport,
  options?: IRpcOptions,
): HandlerMap {
  return getClient<HandlerMap>(CqrsType.Command, transport, options)
}
