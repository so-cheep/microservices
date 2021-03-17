import { NatsTransport } from '../nats.transport'

describe('nats.transport', () => {
  it('should work on all steps', async () => {
    const transport = new NatsTransport({
      moduleName: 'Test',
    })

    await transport.init()

    transport.on('PING', async () => {
      // console.log('ping received')

      return 'PONG'
    })

    await transport.start()

    const result = await transport.execute({
      route: 'PING',
      payload: {},
    })

    expect(result).toBe(true)

    await transport.dispose()
  })
})
