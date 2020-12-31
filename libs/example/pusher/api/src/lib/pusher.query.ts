import { IHandlerMap } from '@cheep/microservices'

export interface PusherQuery extends IHandlerMap {
  getUserSockets(props: { socketId: string }): Promise<void>
}
