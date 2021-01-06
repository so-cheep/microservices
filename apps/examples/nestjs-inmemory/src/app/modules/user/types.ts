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
  [UserQueryService],
  [UserCommandService],
  UserEvents
>

export interface UserEvents {
  created: (user: User) => void
  deleted: (user: User) => void
  Nested: {
    single: (x: number) => void
    Deeper: {
      double: (x: boolean) => void
    }
  }
}
