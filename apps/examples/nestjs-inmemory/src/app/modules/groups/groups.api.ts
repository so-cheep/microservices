import type { Referrer } from '@cheep/transport'
import { ApiWithExecutableKeys } from '@cheep/transport-api'
import type { GroupCommands } from './group.commands'
import type { GroupQueries } from './group.queries'

export interface Group {
  id: number
  name: string
  color: 'red' | 'blue'
  members: number[]
}

export interface UserGroup {
  id: number
  name: string
}

export type GroupsApi = ApiWithExecutableKeys<
  {
    Query: { Group: GroupQueries }
    Command: { Group: GroupCommands }
    Event: {
      Group: {
        created: (group: Group, ref?: Referrer) => void
        updated: (group: Group, ref?: Referrer) => void
        Members: {
          changed: (group: Group, ref?: Referrer) => void
        }
      }
    }
  },
  'Command' | 'Query'
>

export type GroupsRemoteApi = import('../user/user.api').UserApi
