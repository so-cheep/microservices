import { MemoryTransport } from '@cheep/transport'
import { createTransportApi } from '../createTransportApi'
import { createTransportHandler } from '../createTransportHandler'
import { ApiWithExecutableKeys } from '../types'

describe('createApi', () => {
  it('should work', async () => {
    const transport = new MemoryTransport(
      {},
      {
        jsonDecode: JSON.parse,
        jsonEncode: JSON.stringify,
        newId: () => Date.now().toString(),
      },
    )

    const handler = createTransportHandler<LocalApi>(transport, {})

    handler.on(
      x => x.Command.login,
      async (api, x) => {
        if (x.username === x.password) {
          return { test: 'none' }
        }

        return { test: 'ezeki' }
      },
    )

    handler.on(
      x => x.Command.Custom._('US').register,
      (_, x) => {
        return 'ezeki'
      },
    )

    handler.on(
      x => x.Command.Custom._('US').test2,
      async (_, x) => {
        return { name: '123' }
      },
    )

    const api = createTransportApi<RemoteApi>(transport)

    const r1 = await api.execute.Command.Custom._('US')
      .$({ socketId: '123' })
      .register({ username: 'ezeki' })

    expect(r1).toBe('ezeki')

    const result = await api.execute.Command.login({
      username: '123',
      password: '123',
    })

    const r2 = await api.publish.Command.Custom._('US')
      .$({ socketId: '123' })
      .register({ username: 'ezeki' })

    await api.publish.Command.Custom._('US').test2({ t: '123' })

    await api.publish.Command.login({
      username: '123',
      password: '123',
    })

    expect(result.test).toBe('none')
  })
})

type RemoteApi = ApiWithExecutableKeys<
  UserApi & RoleApi,
  'Command' | 'Query'
>
type LocalApi = ApiWithExecutableKeys<UserApi>

type RoleApi = {
  Command: {
    runSomething(props: { test: number }): Promise<string>
  }
}

type UserApi = {
  $: ({
    meta2: string,
  }) => {
    test3(props: { t: any }): Promise<{ name: string }>
    test4(props: { t: any }): { name: string }
  }

  Command: {
    login(props: {
      username: string
      password: string
    }): Promise<{ test: string }>

    Custom: {
      $: ({
        meta2: string,
      }) => {
        test3(props: { t: any }): Promise<{ name: string }>
        test4(props: { t: any }): { name: string }
      }

      _: (
        region: string,
      ) => {
        test(props: { t: any }): Promise<{ name: string }>
        test2(props: { t: any }): { name: string }

        $: ({
          socketId: string,
        }) => {
          register(props: { username: string }): Promise<string>
        }
      }
    }
  }

  Query: {
    getUsersCount(props: { id: string }): Promise<number>
  }
}
