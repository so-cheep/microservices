import { PusherClientInputMessage } from './pusherClientInput.message'

export interface PusherClient<
  In extends PusherClientInputMessage,
  Out
> {
  connect(): Promise<void>
  disconnect(): Promise<void>
}
