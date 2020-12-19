import { Message } from '@nx-cqrs/shared'

export type PusherClientMessage<
  TClientMessage extends Message<TClientMessage> = { type: string }
> = {
  type: string
  appId: string
  message: TClientMessage
}
