import { CqrsType } from './cqrs/constants'
import { CommandMap, QueryMap } from './cqrs/types'
import { EventMap } from './events/types'

export interface MicroserviceApi<
  TNamespace extends string,
  TQueryHandler extends QueryMap,
  TCommandHandler extends CommandMap,
  TEvents extends EventMap
> {
  namespace: TNamespace
  [CqrsType.Command]: TCommandHandler
  [CqrsType.Query]: TQueryHandler
  events: TEvents
}
