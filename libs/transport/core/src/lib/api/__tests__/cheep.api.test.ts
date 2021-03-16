import {
  callStackReducer,
  callStackValidator,
  createdAtReducer,
  MemoryTransport,
  transactionReducer,
} from '@cheep/transport'
import { performance } from 'perf_hooks'
import { createTransportApi } from '../createTransportApi'
import { recursiveApiCaller } from '../recursiveApiCaller'
import { createTransportHandler } from '../createTransportHandler'
import { ApiWithExecutableKeys } from '../types'

type T = {
  A1: {
    B: (props: { count: number }) => boolean
  }
  A2: {
    B: {
      $: (arg: {
        socketId: string
      }) => {
        C: () => Promise<number>
        D: () => void
        E: (props: { id: string; count: number }) => Promise<string>
        F: (a1: string, a2: number, a3: boolean) => Promise<string>
      }
      X: () => boolean
    }
    B2: {
      _: (
        routeVar: string,
      ) => {
        X: () => void
        $: (arg: {
          socketId: string
        }) => {
          C2: (arg: {
            thing: [number, string, boolean, null]
          }) => Promise<void>
        }
      }
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
                  _: (
                    routeModifier: string,
                  ) => {
                    I: (
                      props: { count: number },
                      isGood?: boolean,
                    ) => void
                  }
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
  it('should work', async () => {
    const transport = new MemoryTransport(
      {},
      {
        jsonDecode: JSON.parse,
        jsonEncode: JSON.stringify,
        newId: () => Date.now().toString(),
      },
    )

    const rootApi = createTransportApi<
      ApiWithExecutableKeys<T, 'A1' | 'A2'>
    >(transport)

    const handler = createTransportHandler<ApiWithExecutableKeys<T>>(
      transport,
    )

    const mockHandler = jest.fn().mockReturnValue(true)
    handler.on(x => x.A1.B, mockHandler)

    const result = await rootApi.execute.A1.B({
      count: 10,
    })

    expect(mockHandler).toHaveBeenCalledTimes(1)
    expect(mockHandler).toHaveBeenCalledWith(
      expect.anything(),
      { count: 10 },
      expect.anything(),
    )
    expect(result).toBeTruthy()
  })
  it('should work with route variables', async () => {
    const transport = new MemoryTransport(
      {},
      {
        jsonDecode: JSON.parse,
        jsonEncode: JSON.stringify,
        newId: () => Date.now().toString(),
      },
    )

    const rootApi = createTransportApi<
      ApiWithExecutableKeys<T, 'A1' | 'A2'>
    >(transport)

    const handler = createTransportHandler<ApiWithExecutableKeys<T>>(
      transport,
    )

    handler.on(
      x => x.A3.B.C.D.E.F.G.H._('routed').I,
      async (_, x) => {
        expect(x.count).toBe(10)
      },
    )

    await rootApi.publish.A3.B.C.D.E.F.G.H._('routed').I({
      count: 10,
    })
  })

  it('should work with metadata injection operator', async () => {
    const transport = new MemoryTransport(
      {},
      {
        jsonDecode: JSON.parse,
        jsonEncode: JSON.stringify,
        newId: () => Date.now().toString(),
      },
    )

    const rootApi = createTransportApi<
      ApiWithExecutableKeys<T, 'A1' | 'A2'>
    >(transport)

    const handler = createTransportHandler<ApiWithExecutableKeys<T>>(
      transport,
    )

    const mockHandle = jest.fn()
    handler.on(x => x.A2.B.C, mockHandle)

    const routeParam = { socketId: 'wipekafnoeinwef' }

    await rootApi.publish.A2.B.$(routeParam).C()

    expect(mockHandle).toHaveBeenCalledTimes(1)

    // last arg to function is metadata
    const meta = mockHandle.mock.calls[0].slice(-1).pop()
    expect(meta).toMatchObject(expect.objectContaining(routeParam))
  })

  it('should work with route variable + metadata injection operators', async () => {
    const transport = new MemoryTransport(
      {},
      {
        jsonDecode: JSON.parse,
        jsonEncode: JSON.stringify,
        newId: () => Date.now().toString(),
      },
    )

    const rootApi = createTransportApi<
      ApiWithExecutableKeys<T, 'A1' | 'A2'>
    >(transport)

    const handler = createTransportHandler<ApiWithExecutableKeys<T>>(
      transport,
    )

    const mockHandle = jest.fn().mockResolvedValue(7)
    handler.on(x => x.A2.B2._('routeString').C2, mockHandle)

    const routeParam = { socketId: 'wipekafnoeinwef' }

    const result = await rootApi.execute.A2.B2._('routeString')
      .$(routeParam)
      .C2({ thing: [5, 'x', true, null] })

    expect(result).toBe(7)
    expect(mockHandle).toHaveBeenCalledTimes(1)

    // last arg to function is metadata
    const meta = mockHandle.mock.calls[0].slice(-1).pop()
    expect(meta).toMatchObject(expect.objectContaining(routeParam))
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

    const rootApi = createTransportApi<
      ApiWithExecutableKeys<PusherApi, 'Command'>
    >(transport)

    const handler = createTransportHandler<
      ApiWithExecutableKeys<PusherApi>
    >(transport)

    handler.on(
      x => x.Command.Pusher.sendToSocket,
      async x => {
        return 123
      },
    )

    const result = await rootApi.execute.Command.Pusher.sendToSocket({
      socketId: 's1',
      message: 'Hi',
    })

    expect(result).toBe(123)
  })

  it('should not take too much time', done => {
    const transport = {
      execute: jest.fn(),
      publish: jest.fn(),
    }

    const proxy: any = recursiveApiCaller(<any>transport, {
      mode: 'EXECUTE',
      joinSymbol: '.',
    })
    const count = 10

    const startedAt = performance.now()
    for (let i = 0; i < count; i++) {
      proxy.Command.User._(i).login({
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

    expect(transport.execute).toBeCalledTimes(count)
    done()
    // expect(avgDuration).toBeLessThan(0.015)
  })

  // TODO: move this test to transport base lib
  it('check recursion and fire error', done => {
    const newId = () => Date.now().toString()

    const transport = new MemoryTransport<any>(
      {
        metadataReducers: [
          createdAtReducer(Date.now),
          transactionReducer(newId, Date.now),
          callStackReducer(),
        ],
        metadataValidator: [callStackValidator('all')],
      },
      {
        jsonDecode: JSON.parse,
        jsonEncode: JSON.stringify,
        newId,
      },
    )

    const handler = createTransportHandler<
      ApiWithExecutableKeys<UserApi, 'Command'>
    >(transport)

    const rootApi = createTransportApi<
      ApiWithExecutableKeys<UserApi, 'Command'>
    >(transport)

    handler.on(
      x => x.Command.User.register,
      async (api, x, m) => {
        expect(m).toBeDefined()
        try {
          const result = await api.execute.Command.User.login({
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
        api.execute.Command.User.register({ age: 10 })

        return {
          token: '',
        }
      },
    )

    rootApi.execute.Command.User.login({ username: '', password: '' })
  })
})
