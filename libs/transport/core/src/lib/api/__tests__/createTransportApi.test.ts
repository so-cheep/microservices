import { MemoryTransport } from '../../memory.transport'
import { createdAtReducer } from '../../metadataReducers/createdAt.reducer'
import { createTransportApi } from '../createTransportApi'
import { ApiWithExecutableKeys } from '../types'

describe('createTransportApi', () => {
  it('should append metadata', async () => {
    const transport = new MemoryTransport({
      metadataReducers: [createdAtReducer(Date.now)],
    })

    const api = createTransportApi<
      ApiWithExecutableKeys<
        {
          test: () => Promise<{
            mockUser: boolean
            createdAt: number
          }>
        },
        'test'
      >
    >(transport, {
      metadata: { mockUser: true },
    })

    transport.on('test', ({ metadata }) => metadata)

    const result = await api.execute.test()

    expect(result.mockUser).toBe(true)
    expect(result.createdAt).toBeTruthy()
  })
})
