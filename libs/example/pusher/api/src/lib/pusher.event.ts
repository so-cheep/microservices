import { HandlerMap } from '@cheep/microservices'

export interface PusherEvent extends HandlerMap {
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
