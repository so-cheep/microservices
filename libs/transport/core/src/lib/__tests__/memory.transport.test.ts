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
      message: {
        pingedAt: new Date(),
      },
      metadata: {
        sessionId: 's1',
      },
    })

    expect(result).toBe('PONG')
  })

  it('should receve published event', async done => {
    transport.on('User.Created', async ({ message, metadata }) => {
      const msg = message as any

      expect(msg.userId).toBe('u1')
      expect(metadata.sessionId).toBe('s1')

      done()
    })

    await transport.start()

    const result = await transport.publish({
      route: 'User.Created',
      message: {
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
})
