import { MicroserviceApi } from '../types'
import 'reflect-metadata'

export interface User {
  name: string
  id: number
}

export interface userEventMap {
  created: (user: User) => void
  updated: (user: User) => void
  nested: {
    thingAed: (number: number) => void
    thingBed: (bool: boolean) => void
  }
}

export type UserApi = MicroserviceApi<
  'User',
  never,
  never,
  userEventMap
>

export type Api2 = MicroserviceApi<
  'Game',
  never,
  never,
  {
    created: ({ name: string, id: number }) => void
    blooped: {
      thingAed: (number: number) => void
      thingBed: (bool: boolean) => void
    }
  }
>
