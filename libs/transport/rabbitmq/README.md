# RabbitMQ transport for Cheep

Basic example:

```ts
import { RabbitMQTransport } from '@cheep/transport-rabbitmq'

const transport = new RabbitMQTransport({
  moduleName: 'Test',
  amqpConnectionString: 'amqp://localhost:5672',
  publishExchangeName: 'Hub',
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
