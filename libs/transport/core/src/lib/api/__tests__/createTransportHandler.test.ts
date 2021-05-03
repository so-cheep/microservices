import { MemoryTransport } from '../../memory.transport'
import { createTransportApi } from '../createTransportApi'
import { createTransportHandler } from '../createTransportHandler'
import { ApiWithExecutableKeys } from '../types'

describe('createTransportHandler', () => {
  type Api = ApiWithExecutableKeys<
    {
      Command: {
        create(): Promise<string>
      }
      Event: {
        userCreated(e: { username: string }): void
        userUpdated(e: { username: string; name: string }): void
      }
    },
    'Command'
  >

  it('should subscribe just one handler', async done => {
    const transport = new MemoryTransport()

    const api = createTransportApi<Api>(transport)
    const handler = createTransportHandler<Api>(transport)

    handler.on(
      x => x.Event.userCreated,
      (_, x) => {
        expect(x).toBeTruthy()
        expect(x.username).toBe('ez')
        done()
      },
    )

    await api.publish.Event.userCreated({ username: 'ez' })
  })

  it('should remove handler and have timeout', async () => {
    const transport = new MemoryTransport()

    const api = createTransportApi<Api>(transport)
    const handler = createTransportHandler<Api>(transport)

    const unsubscribe = handler.on(
      x => x.Command.create,
      () => {
        expect('NEVER').toBe('HERE')
        return 'ez'
      },
    )

    unsubscribe()

    await api.execute.Command.create().catch(err => {
      expect(err).toBeTruthy()
    })
  })
})
