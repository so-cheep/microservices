import { CheepNestApi } from '@cheep/nestjs'
import type { GroupCommandService } from './group.command.service'
import type { GroupQueryService } from './group.query.service'

export interface Group {
  id: number
  name: string
  color: 'red' | 'blue'
}

export interface UserGroup {
  id: number
  name: string
}

export type GroupApi = CheepNestApi<
  'Group',
  [GroupQueryService],
  [GroupCommandService],
  {
    created: (user: Group) => void
  }
>
