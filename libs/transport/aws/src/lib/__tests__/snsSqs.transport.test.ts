import { Transport } from '@cheep/transport'
import { SnsSqsTransport } from '../snsSqs.transport'

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

let transport: Transport<any>
let i = 0

const delay = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time))

jest.setTimeout(20000) // need for aws setup

beforeEach(async () => {
  // const config = new AWS.Config({
  //   region: 'us-east-1',
  // })

  transport = new SnsSqsTransport({
    moduleName: 'TESTING4',
    publishExchangeName: 'TEST_HUB',
    region: 'us-east-1',
    newId: () => Date.now().toString() + ++i,
    queueWaitTimeInSeconds: 0.1,
    queueMaxNumberOfMessages: 1,
    responseQueueWaitTimeInSeconds: 0.1,
    responseQueueMaxNumberOfMessages: 1,
  })

  await transport.init()

  await transport.listenPatterns(['Command.User.Login'])
})

afterEach(async () => {
  transport.dispose()
  await delay(200)
})

describe('transport', () => {
  it('should publish and receive the message', async done => {
    const sessionId = '123'
    const message = Date.now().toString()

    transport.message$.subscribe(x => {
      expect(x.message).toBe(message)
      done()

      x.complete(true)
      transport.stop()
    })

    transport.start()

    await transport.publish({
      route: 'Command.User.Login',
      message,
      metadata: { sessionId },
    })
  })

  it('should ping pong', async () => {
    const sessionId = '123'

    transport.message$.subscribe(x => {
      if (x.message === 'PING') {
        x.sendReply('PONG')
      }

      x.complete(true)
    })

    transport.start()

    const result = await transport.publish({
      route: 'Command.User.Login',
      message: 'PING',
      metadata: { sessionId },
      rpc: {
        enabled: true,
        timeout: 7000,
      },
    })

    expect(result.result).toBe('PONG')
    expect(result.metadata.sessionId).toBe(sessionId)
  })
})
