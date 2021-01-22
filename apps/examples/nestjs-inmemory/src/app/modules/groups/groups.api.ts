import { CheepNestApi } from '@cheep/nestjs'
import { AppMetadata } from '../../types'
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

export type GroupApi = CheepNestApi<
  'Group',
  GroupQueries,
  GroupCommands,
  {
    created: (user: Group) => void
    updated: (user: Group) => void
    Members: {
      changed: (group: Group) => void
    }
  },
  AppMetadata
>
