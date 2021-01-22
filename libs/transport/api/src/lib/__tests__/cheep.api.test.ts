import {
  callStackRule,
  callStackValidator,
  createdAtRule,
  MemoryTransport,
  transactionIdRule,
} from '@cheep/transport'
import { performance } from 'perf_hooks'
import { cheepApi } from '../cheep.api'
import { cheepHandler } from '../cheep.handler'
import { recursiveApiCaller } from '../recursiveApiCaller'

type T = {
  A1: {
    B: () => boolean
  }
  A2: {
    B: {
      C: () => number
      D: () => void
      E: (props: { id: string; count: number }) => Promise<string>
      F: (a1: string, a2: number, a3: boolean) => Promise<string>
    }
  }
  A3: {
    B: {
      C: {
        D: {
          E: {
            F: {
              G: {
                H: {
                  I: (props: { count: number }) => void
                }
              }
            }
          }
        }
      }
    }
  }
}

type UserApi = {
  Command: {
    User: {
      login(props: {
        username: string
        password: string
      }): Promise<{ token: string }>
      register(props: { age: number }): void
    }
  }

  Event: {
    User: {
      registered(props: { age: number }): void
    }
  }
}

type PusherApi = {
  Command: {
    Pusher: {
      sendToSocket(props: {
        socketId: string
        message: unknown
      }): Promise<number>
    }
  }

  Event: {
    Pusher: {
      socketConnected(props: { socketId: string }): void
    }
  }
}

describe('cheep.api', () => {
  it('should work', done => {
    const transport = new MemoryTransport(
      {},
      {
        jsonDecode: JSON.parse,
        jsonEncode: JSON.stringify,
        newId: () => Date.now().toString(),
      },
    )

    const rootApi = cheepApi<T>(transport)

    const handler = cheepHandler<T>(transport, {
      executablePrefixes: ['A1', 'A2'],
    })

    handler.on(
      x => x.A3.B.C.D.E.F.G.H.I,
      async (_, x) => {
        expect(x.count).toBe(10)
        done()
      },
    )

    rootApi.A3.B.C.D.E.F.G.H.I({ count: 10 })
  })

  it('should receive events', async () => {
    const transport = new MemoryTransport(
      {},
      {
        jsonDecode: JSON.parse,
        jsonEncode: JSON.stringify,
        newId: () => Date.now().toString(),
      },
    )

    const rootApi = cheepApi<PusherApi>(transport, {
      executablePrefixes: ['Command', 'Event'],
    })

    const handler = cheepHandler<UserApi & PusherApi>(transport, {
      executablePrefixes: ['Command', 'Event'],
    })

    handler.on(
      x => x.Command.Pusher.sendToSocket,
      async x => {
        return '123'
      },
    )

    const result = await rootApi.Command.Pusher.sendToSocket({
      socketId: 's1',
      message: 'Hi',
    })

    expect(result).toBe('123')
  })

  it('should not take too much time', async () => {
    const transport = {
      publish: jest.fn(),
    }

    const proxy: any = recursiveApiCaller(<any>transport, {
      executablePrefixes: [],
      joinSymbol: '.',
    })

    const count = 10

    const startedAt = performance.now()
    for (let i = 0; i < count; i++) {
      proxy.Command.User['Login' + i]({
        username: 'playerx',
        password: '123',
      })
    }
    const endedAt = performance.now()

    const duration = endedAt - startedAt
    const avgDuration = duration / count

    // 0.019358897209167482

    console.log(
      'duration:',
      duration,
      '1 proxy call avg:',
      avgDuration,
    )

    expect(transport.publish).toBeCalledTimes(count)
    // expect(avgDuration).toBeLessThan(1)
  })

  it.only('pass referrer context', done => {
    const newId = () => Date.now().toString()

    const transport = new MemoryTransport(
      {
        metadataRules: [
          transactionIdRule(newId),
          createdAtRule(Date.now),
          callStackRule(),
        ],
        metadataValidator: [callStackValidator()],
      },
      {
        jsonDecode: JSON.parse,
        jsonEncode: JSON.stringify,
        newId,
      },
    )

    const handler = cheepHandler<UserApi>(transport)
    const rootApi = cheepApi<UserApi>(transport)

    handler.on(
      x => x.Command.User.register,
      async (api, x, m) => {
        expect(m).toBeDefined()
        try {
          const result = await api.Command.User.login({
            password: 'adwad',
            username: 'sd',
          })
          expect('NEVER').toBe('Fired')
        } catch (err) {
          expect(err.className).toBe('RecursionCallError')
        }

        done()
      },
    )

    handler.on(
      x => x.Command.User.login,
      async (api, x, m) => {
        api.Command.User.register({ age: 10 })
      },
    )

    rootApi.Command.User.login({ username: '', password: '' })
  })
})
