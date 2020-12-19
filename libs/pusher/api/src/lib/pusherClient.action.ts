export type PusherClientAction =
  | {
      type: 'Socket.Online'
      socketId: string
      userId: string
    }
  | {
      type: 'Socket.Offline'
      socketId: string
      userId: string
    }
