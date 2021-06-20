import { ApiWithExecutableKeys } from '@cheep/transport'
import type { GroupsApi } from '../../nestjs-inmemory/src/app/modules/groups/groups.api'
import type { UserApi } from '../../nestjs-inmemory/src/app/modules/user/user.api'

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
