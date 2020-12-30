import { MicroserviceApi } from '@nx-cqrs/cqrs/rpc'
import { UserCommand } from './lib/user.command'
import { UserEvent } from './lib/user.event'
import { UserQuery } from './lib/user.query'

export type UserApi = MicroserviceApi<
  'User',
  UserCommand,
  UserQuery,
  UserEvent
>
