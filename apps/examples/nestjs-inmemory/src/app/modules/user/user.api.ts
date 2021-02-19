import { Referrer } from '@cheep/transport'
import { Group } from '../groups/groups.api'
import type { UserCommands } from './user.commands'
import type { UserQueries } from './user.query.service'

export interface User {
  id: number
  name: string
  email: string
}

export interface UserGroup {
  id: number
  name: string
}

export type UserApi = {
  Query: { User: UserQueries }
  Command: { User: UserCommands }
  Event: { User: UserEvents }
}

export interface UserEvents {
  created: (user: User, ref?: Referrer) => void
  deleted: (user: User, ref?: Referrer) => void
  GroupMembership: {
    added: (group: Group, user: User, ref?: Referrer) => void
    Deeper: {
      double: (x: boolean, ref?: Referrer) => void
    }
  }
}
