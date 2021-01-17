import { RemoteError, Transport } from '@cheep/transport'
import { SNS, SQS } from 'aws-sdk'
import { SnsSqsTransport } from '../snsSqs.transport'

let transport: Transport
let i = 0

jest.setTimeout(30000) // need for aws setup

beforeAll(async () => {
  transport = new SnsSqsTransport(
    {
      config: {
        type: 'AUTO',
        moduleName: 'Test',
        publishTopicName: 'TestHubTopic',
      },
      queueMaxNumberOfMessages: 1,
      queueWaitTimeInSeconds: 1,
      responseQueueMaxNumberOfMessages: 1,
      responseQueueWaitTimeInSeconds: 1,
      defaultRpcTimeout: 5000,
    },
    {
      jsonDecode: JSON.parse,
      jsonEncode: JSON.stringify,
      newId: () => Date.now().toString() + (++i).toString(),
      getSns: () => new SNS({ region: 'us-east-1' }),
      getSqs: () => new SQS({ region: 'us-east-1' }),
      getMessageGroup: route =>
        route.split('.').slice(0, 2).join('.'),
    },
  )

  await transport.init()

  transport.on('PING', async ({ metadata }) => {
    return 'PONG'
  })

  transport.on('Command.User.Login', async ({ metadata }) => {
    return 'SUCCESS'
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

describe('snsSqs.transport', () => {
  it('should execute and receive response', async () => {
    const result = await transport.execute({
      route: 'Command.User.Login',
      message: {
        pingedAt: new Date(),
      },
      metadata: {
        sessionId: 's1',
      },
    })

    expect(result).toBe('SUCCESS')
    // expect('SUCCESS').toBe('SUCCESS')
  })

  xit('should receve published event', async done => {
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
    try {
      await transport.execute({
        route: 'User.Register',
        message: {
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
      message: {},
    })

    expect(result).toBeUndefined()
  })

  it('should receve null', async () => {
    const result = await transport.execute({
      route: 'Return.Null',
      message: {},
    })

    expect(result).toBeNull()
  })

  it('should receve void (undefined)', async () => {
    const result = await transport.execute({
      route: 'Return.Void',
      message: {},
    })

    expect(result).toBeUndefined()
  })
})
