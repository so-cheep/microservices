import { Transport } from '@cheep/transport'
import { Subject } from 'rxjs'
import { filter } from 'rxjs/operators'

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

// beforeAll(async () => {
//   // const config = new AWS.Config({
//   //   region: 'us-east-1',
//   // })
//   try {
//     transport = new SnsSqsTransport({
//       moduleName: 'TESTING4',
//       publishExchangeName: 'TEST_HUB',
//       region: 'us-east-1',
//       newId: () => Date.now().toString() + ++i,
//       queueWaitTimeInSeconds: 0.1,
//       queueMaxNumberOfMessages: 1,
//       responseQueueWaitTimeInSeconds: 0.1,
//       responseQueueMaxNumberOfMessages: 1,
//     })

//     await transport.init()

//     await transport.listenPatterns(['Command.User.Login'])
//   } catch (err) {
//     console.log('init error', err)
//   }
// })

// afterAll(async () => {
//   await transport.dispose()
// })

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

  it.only('time check', async () => {
    // Map - Setup

    const [___, startedAt2] = process.hrtime()
    const map = new Map<string, (x: any) => void>()

    new Array(100).fill(0).forEach((_, i) => {
      map.set(i.toString(), x => {})
    })

    const [____, endedAt2] = process.hrtime()
    console.log('Map Setup', endedAt2 - startedAt2)

    // Map - Call
    {
      const [___, startedAt2] = process.hrtime()

      for (let i = 0; i++; i < 100000000) {
        map.get(i.toString())(i)
      }

      const [____, endedAt2] = process.hrtime()
      console.log('Map Call', endedAt2 - startedAt2)
    }

    // RX - Setup

    const [_, startedAt] = process.hrtime()

    const message$ = new Subject<{ route: string }>()
    new Array(100).fill(0).forEach((_, i) => {
      message$
        .pipe(filter(x => x.route === i.toString()))
        .subscribe(x => {})
    })

    const [__, endedAt] = process.hrtime()
    console.log('RX Setup', endedAt - startedAt)

    // RX - Call
    {
      const [_, startedAt] = process.hrtime()

      for (let i = 0; i++; i < 100000000) {
        message$.next({ route: i.toString() })
      }

      const [__, endedAt] = process.hrtime()
      console.log('RX Call', endedAt - startedAt)
    }
  })
})
