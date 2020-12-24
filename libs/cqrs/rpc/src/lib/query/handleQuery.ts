import { ITransport } from '../../../../types/src'
import { CqrsType } from '../constants'
import { handle } from '../handle'
import { THandlerArg } from '../types'

export function handleQuery(
  transport: ITransport,
  handlers: THandlerArg,
) {
  return handle(CqrsType.Query, transport, handlers)
}
