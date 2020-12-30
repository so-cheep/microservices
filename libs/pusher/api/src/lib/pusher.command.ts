import { IHandlerMap } from '@nx-cqrs/cqrs/rpc'

export interface PusherCommand<TMessage = any> extends IHandlerMap {
  sendToSocket(props: {
    socketId: string
    message: TMessage
  }): Promise<void>

  sentToChannel(props: {
    channel: string
    message: TMessage
  }): Promise<void>

  sendToEveryone(props: { message: TMessage }): Promise<void>

  joinChannels(props: {
    socketId: string
    channels: string[]
  }): Promise<void>

  leaveChannels(props: {
    socketId: string
    channels: string[]
  }): Promise<void>
}
