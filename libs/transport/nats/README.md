# NATS transport for Cheep

Basic example:

```ts
const transport = new NatsTransport({
  moduleName: 'Test',
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
