import { CheepNestApi } from '@cheep/nestjs'
import type { UserCommandService } from './user.command.service'
import type { UserQueryService } from './user.query.service'
import type { UserGroupQueryService } from './userGroup.query.service'

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
  [UserQueryService, UserGroupQueryService],
  [UserCommandService],
  {
    user: {
      created: (user: User) => void
    }
  }
>
