export type PusherClientInputMessage =
  | {
      type: 'Pusher.Client.Connected'
    }
  | {
      type: 'Pusher.Client.Error'
      reasonCode: 'CONNECT_ERROR' | 'CONNECT_TIMEOUT'
      error?: Error
    }
  | {
      type: 'Pusher.Client.ReconnectAttempted'
    }
  | {
      type: 'Pusher.Client.Reconnecting'
      attempt: number
    }
  | {
      type: 'Pusher.Client.Disconnected'
    }
