import { EventNamespaceMetadataKey } from '../constants'
import { EventApi, EventBase } from '../types'
import 'reflect-metadata'

export interface User {
  name: string
  id: number
}

export interface userEventMap {
  created: (user: User) => void
  nested: {
    thingAed: (number: number) => void
    thingBed: (bool: boolean) => void
  }
}

export type UserApi = EventApi<'User', userEventMap>

export type Api2 = EventApi<
  'Game',
  {
    created: ({ name: string, id: number }) => void
    blooped: {
      thingAed: (number: number) => void
      thingBed: (bool: boolean) => void
    }
  }
>

export enum Action {
  Create = 'CREATE',
  Update = 'UPDATE',
  Delete = 'DELETE',
}

export class BaseEvent extends EventBase {
  public readonly action: Action
}

export class UserEvent extends BaseEvent {
  constructor(public readonly user: User) {
    super()
  }
}
export class UserUpdateEvent extends UserEvent {
  action: Action.Update
}
export class UserDeleteEvent extends UserEvent {
  action: Action.Delete
}

Reflect.defineMetadata(EventNamespaceMetadataKey, 'User', UserEvent)
