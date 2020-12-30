import { IHandlerMap } from '@nx-cqrs/cqrs/rpc'

export interface PusherEvent extends IHandlerMap {
  socketConnected(props: {
    socketId: string
    userId: string
    activeConnectionsCount: number
  })

  socketDisconnected(props: {
    socketId: string
    userId: string
    activeConnectionsCount: number
  })
}
