import { MemoryTransport } from '../../memory.transport'
import { createTransportApi } from '../createTransportApi'
import { createTransportHandler } from '../createTransportHandler'
import { ApiWithExecutableKeys } from '../types'

describe('createTransportHandler', () => {
  type Api = ApiWithExecutableKeys<
    {
      Event: {
        userCreated(e: { username: string })
        userUpdated(e: { username: string; name: string })
      }
    },
    never
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
})
