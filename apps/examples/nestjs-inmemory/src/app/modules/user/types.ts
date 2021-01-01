import { CheepNestApi } from '@cheep/nestjs'
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

export type UserApi = CheepNestApi<
  'User',
  [UserQueries],
  [UserCommands],
  {
    user: {
      created: (user: User) => void
    }
  }
>
