# NATS transport for Cheep

Basic example:

```ts
import { NatsTransport } from '@cheep/transport-nats'

const transport = new NatsTransport({
  moduleName: 'Test',
  natsServerUrls: ['nats://127.0.0.1:1222'],
})

await transport.init()

transport.on('PING', async () => 'PONG')

await transport.start()

const result = await transport.execute({
  route: 'PING',
  payload: {},
})

expect(result).toBe('PONG')

await transport.dispose()
```
