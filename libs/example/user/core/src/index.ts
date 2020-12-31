import { getClient, handleEventsWithAck } from '@cheep/microservices'
import { MemoryTransport } from '@cheep/transport/shared'
import { PusherApi } from '@nx-cqrs/example/pusher/api'
import { UserApi } from '@nx-cqrs/example/user/api'

export * from './lib/user.command'

const transport = new MemoryTransport<any, string>({
  moduleName: 'User',
})

const pusherApi = getClient<PusherApi>(transport)
const pusherEvents = handleEventsWithAck<PusherApi | UserApi>(
  transport,
)

pusherEvents.handleFunction(
  x => x.User.userCreated,
  async x => {
    await pusherApi.Command.Pusher.getUserSockets({ socketId: '1' })
  },
)
