import { ApiWithExecutableKeys } from '@cheep/transport-api'
import { ClientCommands } from './client.commands'

/* eslint-disable @typescript-eslint/ban-types */
export type ClientApi = ApiWithExecutableKeys<
  {
    Command: {
      XuLi: ClientCommands
    }
    Query: {}
    Event: {}
  },
  'Command' | 'Query'
>

export type ClientRemoteApi = import('../user/user.api').UserApi &
  import('../groups/groups.api').GroupApi
