import { CheepNestApi } from '@cheep/nestjs'
import type { GroupCommands } from './group.commands'
import type { GroupQueries } from './group.queries'

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
  [GroupQueries],
  [GroupCommands],
  {
    created: (user: Group) => void
  }
>
