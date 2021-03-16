import type { UserApi } from '../../nestjs-inmemory/src/app/modules/user/user.api'
import type { GroupsApi } from '../../nestjs-inmemory/src/app/modules/groups/groups.api'
import { ApiWithExecutableKeys } from '@cheep/transport'

export type ClientRemoteApi = UserApi & GroupsApi

export type ClientApi = ApiWithExecutableKeys<
  {
    Command: {
      Ui: {
        showBanner: (arg: { message: string }) => Promise<string>
      }
    }
    Query: {}
  },
  'Command' | 'Query'
>
