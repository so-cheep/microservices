import { EventNamespaceMetadataKey } from '../constants'
import { EventApi, EventBase } from '../types'

export interface User {
  name: string
  id: number
}

export type Api1 = EventApi<
  'User',
  {
    create: (user) => void
    nest: {
      thingA: (number: number) => void
      thingB: (bool: boolean) => void
    }
  }
>

export type Api2 = EventApi<
  'Game',
  {
    noggin: ({ name: string, id: number }) => void
    bloop: {
      thingA: (number: number) => void
      thingB: (bool: boolean) => void
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

export class DomainObjectEvent extends BaseEvent {
  constructor(public readonly user: User) {
    super()
  }
}
export class DomainUpdateEvent extends DomainObjectEvent {
  action: Action.Update
}

Reflect.defineMetadata(
  EventNamespaceMetadataKey,
  'User',
  DomainObjectEvent,
)
