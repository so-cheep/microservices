import { MicroserviceApi } from '@cheep/microservices'
import { PusherCommand } from './lib/pusher.command'
import { PusherEvent } from './lib/pusher.event'
import { PusherQuery } from './lib/pusher.query'

export type PusherApi = MicroserviceApi<
  'Pusher',
  PusherCommand,
  PusherQuery,
  PusherEvent
>
