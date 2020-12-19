import { NotImplementedError } from '@nx-cqrs/shared'

export abstract class PusherCommand<TMessage = any> {
  sendToSocket(props: {
    socketId: string
    message: TMessage
  }): Promise<void> {
    throw new NotImplementedError()
  }

  sentToChannel(props: {
    channel: string
    message: TMessage
  }): Promise<void> {
    throw new NotImplementedError()
  }

  sendToEveryone(props: { message: TMessage }): Promise<void> {
    throw new NotImplementedError()
  }

  joinChannels(props: {
    socketId: string
    channels: string[]
  }): Promise<void> {
    throw new NotImplementedError()
  }

  leaveChannels(props: {
    socketId: string
    channels: string[]
  }): Promise<void> {
    throw new NotImplementedError()
  }
}
