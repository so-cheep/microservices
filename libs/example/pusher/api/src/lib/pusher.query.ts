import { HandlerMap } from '@cheep/microservices'

export interface PusherQuery extends HandlerMap {
  getUserSockets(props: { socketId: string }): Promise<void>
}
