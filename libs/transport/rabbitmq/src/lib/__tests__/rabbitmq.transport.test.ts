import { RemoteError, Transport } from '@cheep/transport'
import { RabbitMQTransport } from '../rabbitmq.transport'

describe('rabbitmq.transport', () => {
  let transport: Transport
  let i = 0

  beforeAll(async () => {
    transport = new RabbitMQTransport(
      {
        defaultRpcTimeout: 3000,
        amqpConnectionString: 'amqp://guest:guest@localhost',
        publishExchangeName: 'HubExchange',
        moduleName: 'TestModule',
        isTestMode: true,
      },
      {
        jsonDecode: JSON.parse,
        jsonEncode: JSON.stringify,
        newId: () => (++i).toString(),
      },
    )

    await transport.init()

    transport.on('PING', async ({ metadata }) => {
      return 'PONG'
    })

    transport.on('User.Register', () => {
      throw new RemoteError('OOPS', '__CallStack__', 'RemoteError')
    })

    transport.on('Return.Undefined', () => {
      return undefined
    })

    transport.on('Return.Null', () => {
      return null
    })

    transport.on('Return.Void', <any>(() => {
      return
    }))

    await transport.start()
  })

  afterAll(async () => {
    await transport.dispose()
  })

  it('should execute and receive response', async () => {
    const result = await transport.execute({
      route: 'PING',
      payload: {
        pingedAt: new Date(),
      },
      metadata: {
        sessionId: 's1',
      },
    })

    expect(result).toBe('PONG')
  })

  it('should receve published event', async done => {
    transport.on('User.Created', async ({ payload, metadata }) => {
      const msg = payload as any

      expect(msg.userId).toBe('u1')
      expect(metadata.sessionId).toBe('s1')

      done()
    })

    await transport.start()

    const result = await transport.publish({
      route: 'User.Created',
      payload: {
        userId: 'u1',
      },
      metadata: {
        sessionId: 's1',
      },
    })
  })

  it('should receve remote error', async () => {
    try {
      await transport.execute({
        route: 'User.Register',
        payload: {
          userId: 'u1',
        },
        metadata: {
          sessionId: 's1',
        },
      })
    } catch (err) {
      expect(err.message).toEqual('OOPS')
      expect(err.className).toEqual('RemoteError')
    }
  })

  it('should receve undefined', async () => {
    const result = await transport.execute({
      route: 'Return.Undefined',
      payload: {},
    })

    expect(result).toBeUndefined()
  })

  it('should receve null', async () => {
    const result = await transport.execute({
      route: 'Return.Null',
      payload: {},
    })

    expect(result).toBeNull()
  })

  it('should receve void (undefined)', async () => {
    const result = await transport.execute({
      route: 'Return.Void',
      payload: {},
    })

    expect(result).toBeUndefined()
  })
})

describe('rabbitmq.transport.lifecycle', () => {
  let transport: Transport
  let i = 0

  beforeAll(async () => {
    transport = new RabbitMQTransport(
      {
        defaultRpcTimeout: 1000,
        amqpConnectionString: 'amqp://guest:guest@localhost',
        publishExchangeName: 'HubExchange',
        moduleName: 'TestModule',
        isTestMode: true,
      },
      {
        jsonDecode: JSON.parse,
        jsonEncode: JSON.stringify,
        newId: () => (++i).toString(),
      },
    )

    await transport.init()

    transport.on('PING', async () => 'PONG')
  })

  afterAll(async () => {
    await transport.dispose()
  })

  it('should start and stop transport successfully', async () => {
    await transport.start()
    // try {
    const r1 = await transport.execute({
      route: 'PING',
      payload: '',
    })
    expect(r1).toBe('PONG')
    // } catch (err) {
    //   console.log('err received1', err.code, err.message)
    // }

    await transport.stop()

    // try {
    //   const r2 = await transport.execute({
    //     route: 'PING',
    //     payload: '',
    //   })

    //   throw new Error('It should never happen')
    // } catch (err) {
    //   expect(err.message).toBe(
    //     'EXECUTE_FAILED_CONNECTION_NOT_STARTED',
    //   )
    // }

    // try {
    //   const task = await transport.execute({
    //     route: 'PING2',
    //     payload: '',
    //   })
    // } catch (err) {
    //   console.log('err received', err)
    // }
    // await task
    //   .then(() => {
    //     throw new Error('IT_SHOULD_NEVER_HAPPEN')
    //   })
    //   .catch(err => {
    //     expect(err.message).toEqual('OOPS')
    //     expect(err.className).toEqual('RemoteError')
    //   })
  })
})

describe.only('rabbitmq.transport.failedMessages', () => {
  let transport: RabbitMQTransport
  let i = 0

  beforeAll(async () => {
    transport = new RabbitMQTransport(
      {
        defaultRpcTimeout: 3000,
        amqpConnectionString: 'amqp://guest:guest@localhost',
        publishExchangeName: 'HubExchange',
        moduleName: 'TestModule',
        isTestMode: true,
      },
      {
        jsonDecode: JSON.parse,
        jsonEncode: JSON.stringify,
        newId: () => (++i).toString(),
      },
    )

    await transport.init()

    transport.on('PROBLEMATIC', async ({ metadata }) => {
      throw new Error('PROBLEM')
    })

    await transport.start()
  })

  afterAll(async () => {
    await transport.dispose()
  })

  it('should receive failed messages', async done => {
    transport.subscribeFailedMessages((x: any) => {
      expect(x).toBeTruthy()
      expect(x.message.handlingErrorData.errorMessage).toBe('PROBLEM')

      done()
    })

    await transport.publish({ route: 'PROBLEMATIC', payload: {} })
  })
})
