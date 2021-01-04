import {
  getCqrsClient,
  getEventPublisher,
  handleCqrsApi,
  handleEvents,
} from '@cheep/microservices'
import { MemoryTransport } from '@cheep/transport'
import { PusherApi } from '@nx-cqrs/example/pusher/api'

const transport = new MemoryTransport<any>({
  moduleName: 'User',
})

/**
 * CQRS
 */
const pusherApi = getCqrsClient<PusherApi>(transport)

// Command
pusherApi.Command.Pusher.getUserSockets({ socketId: 's1' }).then(
  x => {
    // Query
    const data = pusherApi.Query.Pusher.joinChannels({
      socketId: x[0],
      channels: ['GROUP1'],
    })
  },
)

// Handle user commands
handleCqrsApi(transport, {})

/**
 * EVENTS
 */
// Subscribe
const pusherEvents = handleEvents<PusherApi>(transport, ['Pusher'])

pusherEvents.on(
  x => x.Pusher.socketConnected,
  async x => {
    await pusherApi.Command.Pusher.getUserSockets({ socketId: '1' })
  },
)

// Publish
const publisher = getEventPublisher<PusherApi>(transport)
publisher.Pusher.socketConnected({
  socketId: 's1',
  userId: 'u1',
  activeConnectionsCount: 1,
})
