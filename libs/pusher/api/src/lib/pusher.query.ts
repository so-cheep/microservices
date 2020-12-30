import { IHandlerMap } from '@nx-cqrs/cqrs/rpc'

export interface PusherQuery extends IHandlerMap {
  getUserSockets(props: { socketId: string }): Promise<void>
}
