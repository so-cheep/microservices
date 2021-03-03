# Transport Api

## Example

```ts
import { MemoryTransport } from '@cheep/transport'
import { ApiWithExecutableKeys } from '@cheep/transport-api'

type UserApi = ApiWithExecutableKeys<
  {
    Command: {
      Pusher: {
        sendToSocket(props: {
          socketId: string
          message: unknown
        }): Promise<number>
      }
    }

    Event: {
      Pusher: {
        socketConnected(props: { socketId: string }): void
      }
    }
  },
  'Query' | 'Command'
>

// creating transport object
const transport = new MemoryTransport()

// initialization is async process
await transport.init()

// register listeners for specific routes
transport.on('PING', () => 'PONG')

// start listening messages
await transport.start()

// RPC call on the PING route
const result = await transport.execute({
  route: 'PING',
  payload: {},
})

// result will be 'PONG'
```
