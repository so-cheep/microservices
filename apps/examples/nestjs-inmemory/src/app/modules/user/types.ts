import { CheepNestApi } from '@cheep/nestjs'
import type { UserCommandService } from './user.command.service'
import type { UserQueryService } from './user.query.service'

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
  {
    user: {
      created: (user: User) => void
    }
  }
>
