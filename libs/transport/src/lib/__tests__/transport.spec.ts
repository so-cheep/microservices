// import { MemoryTransport } from '../memory.transport'
import { RabbitMQTransport } from '../rabbitmq.transport'
import { ITransport } from '../transport'

type UserCommand =
  | {
      type: 'User.Login'
      username: string
      password: string
    }
  | {
      type: 'User.Register'
      firstName: string
      lastName: string
      email: string
    }
  | {
      type: 'User.ErrorApi'
    }

let transport: ITransport<any, UserCommand>
let i = 0

const delay = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time))

const userId = 'u1'
const errorCode = 'OOPS'

beforeAll(async () => {
  // transport = new MemoryTransport({ moduleName: 'TESTING' })
  transport = new RabbitMQTransport({
    amqpConnectionString: 'amqp://localhost',
    moduleName: 'TESTING' + Date.now().toString(),
    publishExchangeName: 'TEST_HUB',
    newId: () => (++i).toString(),
    forceTempQueues: true,
  })

  await delay(1000)

  transport.listenPatterns([''])
  transport.message$.subscribe(x => {
    try {
      switch (x.message.type) {
        case 'User.Login':
          {
            x.sendReply({ success: true })
            x.complete(true)
          }
          break

        case 'User.Register':
          {
            x.sendReply({ success: true }, { userId })
            x.complete(true)
          }
          break

        case 'User.ErrorApi': {
          throw new Error(errorCode)
        }
      }
    } catch (err) {
      x.sendErrorReply(err)
      x.complete(false)
    }
  })
})

afterAll(() => transport.dispose())

describe('transport', () => {
  it('should publish and receive response with same metadata', async () => {
    const sessionId = '123'

    const result = await transport.publish({
      route: 'Command.User.Login',
      message: {
        type: 'User.Login',
        username: 'ez@jok.io',
        password: '1234',
      },
      metadata: { sessionId },
      rpc: {
        enabled: true,
        timeout: 1000,
      },
    })

    expect(result).toBeTruthy()
    expect(result.metadata.sessionId).toBe(sessionId)
  })

  it('should publish and receive response with additional metadata', async () => {
    const sessionId = '123'

    const result = await transport.publish({
      route: 'Command.User.Register',
      message: {
        type: 'User.Register',
        firstName: 'Ezeki',
        lastName: 'Zibzibadze',
        email: 'ez@jok.io',
      },
      metadata: <any>{ sessionId },
      rpc: {
        enabled: true,
        timeout: 1000,
      },
    })

    expect(result).toBeTruthy()
    expect(result.metadata.userId).toBe(userId)
  })

  it('should publish and receive error back', async () => {
    const sessionId = '123'

    const response = transport.publish({
      route: 'Command.User.ErrorApi',
      message: {
        type: 'User.ErrorApi',
      },
      metadata: <any>{ sessionId },
      rpc: {
        enabled: true,
        timeout: 1000,
      },
    })

    await expect(response).rejects.toThrowError(errorCode)
  })
})
