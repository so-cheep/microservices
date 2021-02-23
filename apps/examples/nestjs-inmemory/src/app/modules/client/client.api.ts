import { ApiWithExecutableKeys } from '@cheep/transport-api'
import { ClientCommands } from './client.commands'

/* eslint-disable @typescript-eslint/ban-types */
export type ClientApi = {
  Command: {
    XuLi: ClientCommands
  }
  Query: {}
  Event: {}
}

export type ClientRemoteApi = ApiWithExecutableKeys<
  import('../user/user.api').UserApi &
    import('../groups/groups.api').GroupApi,
  'Command' | 'Query'
>
