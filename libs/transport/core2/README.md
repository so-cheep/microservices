## Transport

[@cheep/transport](https://www.npmjs.com/package/@cheep/transport) will help you to build Event Driven applications with 💯 type safety.

Basic (dynamic) example:

```ts
import { MemoryTransport } from '@cheep/transport'

// creating transport object
const transport = new MemoryTransport()

// initialization is async process
await transport.init()

// register listeners for specific routes
transport.on('PING', async () => 'PONG')

// start listening messages
await transport.start()

// RPC call on the PING route
const result = await transport.execute({
  route: 'PING',
  payload: {},
})

// result will be 'PONG'
expect(result).toBe('PONG')

// stop listening messages
await transport.stop()

// dispose will call stop as well if necessary
await transport.dispose()
```

Basic (Type Safed) Example:

```ts
import {
  MemoryTransport,
  createTransportHandler,
  createTransportApi,
  ApiWithExecutableKeys,
} from '@cheep/transport'

/**
 * Define api type
 */
type Api = {
  Command: {
    User: {
      login: (props: {
        username: string
        password: string
      }): Promise<boolean>
    }
  }
}

type UserApi = ApiWithExecutableKeys<Api, 'Command'>


/**
 * Use UserApi for type safety
 */
const transport = new MemoryTransport()

const handler = createTransportHandler<UserApi>(transport)
const api = createTransportApi<UserApi>(transport)

await transport.init()

// register listeners
handler.on(
  x => x.Command.User.login,
  (_, payload) => {
    return payload.username === payload.password
  },
)

await transport.start()

// RPC call on the PING route
const result = await api.execute.Command.User.login({
  username: 'Me',
  password: 'Me',
})

expect(result).toBe('PONG')

await transport.dispose()
```
