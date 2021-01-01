import { getCqrsClient, handleEvents } from '@cheep/microservices'
import { MemoryTransport } from '@cheep/transport'
import { PusherApi } from '@nx-cqrs/example/pusher/api'

const transport = new MemoryTransport<any>({
  moduleName: 'User',
})

const pusherApi = getCqrsClient<PusherApi>(transport)
const pusherEvents = handleEvents<PusherApi>(transport, ['Pusher'])

pusherEvents.on(
  x => x.Pusher.socketConnected,
  async x => {
    await pusherApi.Command.Pusher.getUserSockets({ socketId: '1' })
  },
)
