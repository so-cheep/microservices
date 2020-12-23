import { Publisher } from '@nx-cqrs/shared'

export class PusherQuery {
  constructor(private publisher: Publisher) {}

  async getUserSockets(props: { socketId: string }): Promise<void> {
    return this.publisher.publish(props)
  }
}
