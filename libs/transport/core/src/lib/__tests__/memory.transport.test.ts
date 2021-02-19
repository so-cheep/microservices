import { MemoryTransport } from '../memory.transport'
import { RemoteError } from '../remote.error'
import { Transport } from '../transport'

let transport: Transport
let i = 0

// jest.setTimeout(30000) // need for aws setup

beforeEach(async () => {
  transport = new MemoryTransport(
    {
      defaultRpcTimeout: 1000,
      messageDelayTime: 0,
    },
    {
      jsonDecode: JSON.parse,
      jsonEncode: JSON.stringify,
      newId: () => (++i).toString(),
    },
  )

  await transport.init()
})

afterEach(async () => {
  await transport.dispose()
})

describe('memory.transport', () => {
  it('should publish and receive response', async () => {
    transport.on('PING', async ({ metadata }) => {
      expect(metadata.sessionId).toBe('s1')
      return 'PONG'
    })

    await transport.start()

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
    transport.on('User.Create', () => {
      throw new RemoteError('OOPS', '__CallStack__', 'RemoteError')
    })

    await transport.start()

    return transport
      .execute({
        route: 'User.Create',
        message: {
          userId: 'u1',
        },
        metadata: {
          sessionId: 's1',
        },
      })
      .catch(err => {
        expect(err.message).toEqual('OOPS')
        expect(err.className).toEqual('RemoteError')
      })
  })

  it('should receve undefined', async () => {
    transport.on('Return.Undefined', () => {
      return undefined
    })

    await transport.start()

    const result = await transport.execute({
      route: 'Return.Undefined',
      message: {},
    })

    expect(result).toBeUndefined()
  })

  it('should receve null', async () => {
    transport.on('Return.Null', () => {
      return null
    })

    await transport.start()

    const result = await transport.execute({
      route: 'Return.Null',
      message: {},
    })

    expect(result).toBeNull()
  })

  it('should receve void (undefined)', async () => {
    transport.on('Return.Null', <any>(() => {
      return
    }))

    await transport.start()

    const result = await transport.execute({
      route: 'Return.Null',
      message: {},
    })

    expect(result).toBeUndefined()
  })
})
