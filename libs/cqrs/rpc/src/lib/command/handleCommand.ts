import { ITransport } from '../../../../types/src'
import { CqrsType } from '../constants'
import { handle } from '../handle'
import { THandlerArg } from '../types'

export function handleCommand(
  transport: ITransport,
  handlers: THandlerArg,
) {
  return handle(CqrsType.Command, transport, handlers)
}
