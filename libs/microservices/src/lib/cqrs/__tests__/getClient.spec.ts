// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { CqrsType } from '../constants'
import { RpcMetadata, RpcOptions, CqrsApi } from '../types'
import { getCqrsClient } from '../getCqrsClient'
import { constructRouteKey } from '../../utils/constructRouteKey'
import { mockTransport } from '../../__mocks__/transport'

interface Thing {
  x: number
  y: number
  name: string
}
type Get = (id: string) => Promise<Thing>

interface SillyQuery {
  get: Get
}
interface SillyCommand {
  delete: (id: string) => Promise<void>
}

type SillyApi = CqrsApi<'Silly', SillyQuery, SillyCommand>

interface SillyRecursive {
  recurse: SillyRecursive
  get: Get
}
type SillyRecursiveApi = CqrsApi<
  'Silly',
  SillyRecursive,
  SillyCommand
>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('client functionality', () => {
  it('can proxy a 1 layer object', async () => {
    const options: RpcOptions = { timeout: 12345 }
    const base = getCqrsClient<SillyApi>(mockTransport, options)
    const args = 'thing'
    await base.Query.Silly.get(args)

    expect(mockTransport.execute).toHaveBeenCalledTimes(1)
    expect(mockTransport.execute).toHaveBeenLastCalledWith({
      message: [args],
      metadata: expect.objectContaining<RpcMetadata>({
        // iso regex!
        callTime: expect.any(String),
      }),
      route: constructRouteKey({
        busType: CqrsType.Query,
        moduleName: 'Silly',
        functionName: 'get',
      }),
    })
  })

  it('can proxy a 2 layered object', async () => {
    const options: RpcOptions = { timeout: 12345 }
    const base = getCqrsClient<SillyRecursiveApi>(
      mockTransport,
      options,
    )
    const args = 'thing'
    await base.Query.Silly.recurse.get(args)

    expect(mockTransport.execute).toHaveBeenCalledTimes(1)
    expect(mockTransport.execute).toHaveBeenLastCalledWith({
      message: [args],
      metadata: expect.objectContaining<RpcMetadata>({
        // iso regex!
        callTime: expect.any(String),
      }),
      route: constructRouteKey({
        busType: CqrsType.Query,
        moduleName: 'Silly',
        functionName: ['recurse', 'get'],
      }),
    })
  })
  it('can proxy a many layered object', async () => {
    const options: RpcOptions = { timeout: 12345 }
    const base = getCqrsClient<SillyRecursiveApi>(
      mockTransport,
      options,
    )
    const args = 'thing'
    // 10 recurse!
    await base.Query.Silly.recurse.recurse.recurse.recurse.recurse.recurse.recurse.recurse.recurse.recurse.get(
      args,
    )

    expect(mockTransport.execute).toHaveBeenCalledTimes(1)
    expect(mockTransport.execute).toHaveBeenLastCalledWith({
      message: [args],
      metadata: expect.objectContaining<RpcMetadata>({
        // iso regex!
        callTime: expect.any(String),
      }),
      route: constructRouteKey({
        busType: CqrsType.Query,
        moduleName: 'Silly',
        functionName: [...Array(10).fill('recurse'), 'get'],
      }),
    })
  })
})
