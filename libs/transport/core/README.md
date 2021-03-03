## Transport

[@cheep/transport](https://www.npmjs.com/package/@cheep/transport) will help you to build Realtime, Event Driven application. Keep in mind that there is difference between Event Driven and Event Sourcing and they aren't same, [read more about it](https://pablo-iorio.medium.com/event-driven-architectures-vs-event-sourcing-patterns-23d328289bf9).

1. [Naming](docs/naming.md)
2. [Microservices - Big Picture](docs/microservices.md)

## Example

```ts
import { MemoryTransport } from '@cheep/transport'

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
