import { getClient, handleEventsWithAck } from '@nx-cqrs/cqrs/rpc'
import { MemoryTransport } from '@nx-cqrs/cqrs/types'
import { PusherApi } from '@nx-cqrs/pusher/api'
import { UserApi } from '@nx-cqrs/user/api'

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
