import { IHandlerMap } from '@cheep/microservices'

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
