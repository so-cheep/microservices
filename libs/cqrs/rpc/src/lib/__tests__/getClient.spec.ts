// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { IPublishProps } from '@nx-cqrs/cqrs/types'
import { CqrsType } from '../constants'
import { IRpcMetadata, IRpcOptions, IHandlerMap } from '../types'
import { getClient } from '../getClient'
import { encodeRpc } from '../encodeRpc'
import { constructRouteKey } from '../constructRouteKey'
import { mockTransport } from '../__mocks__/transport'

interface Thing {
  x: number
  y: number
  name: string
}
type Get = (id: string) => Promise<Thing>

interface Silly extends IHandlerMap {
  get: Get
}

beforeEach(() => {
  jest.clearAllMocks()
})

it('can proxy a 1 layer object', async () => {
  const options: IRpcOptions = { timeout: 12345 }
  const base = getClient<Silly>(
    CqrsType.Query,
    mockTransport,
    options,
  )
  const args = ['thing'] as [string]
  await base.get(...args)

  expect(mockTransport.publish).toHaveBeenCalledTimes(1)
  expect(mockTransport.publish).toHaveBeenLastCalledWith(
    expect.objectContaining<IPublishProps<IRpcMetadata, string>>({
      message: encodeRpc(args),
      metadata: expect.objectContaining<IRpcMetadata>({
        // iso regex!
        callTime: expect.any(String),
      }),
      route: constructRouteKey({
        busType: CqrsType.Query,
        functionName: 'get',
      }),
      rpc: expect.objectContaining(options),
    }),
  )
})

it('can proxy a 2 layered object', async () => {
  interface SillyRecursive extends IHandlerMap {
    silly: SillyRecursive
    get: Get
  }
  const options: IRpcOptions = { timeout: 12345 }
  const base = getClient<SillyRecursive>(
    CqrsType.Query,
    mockTransport,
    options,
  )
  const args = ['thing'] as [string]
  await base.silly.get(...args)

  expect(mockTransport.publish).toHaveBeenCalledTimes(1)
  expect(mockTransport.publish).toHaveBeenLastCalledWith(
    expect.objectContaining<IPublishProps<IRpcMetadata, string>>({
      message: encodeRpc(args),
      metadata: expect.objectContaining<IRpcMetadata>({
        // iso regex!
        callTime: expect.any(String),
      }),
      route: constructRouteKey({
        busType: CqrsType.Query,
        functionName: ['silly', 'get'],
      }),
      rpc: expect.objectContaining(options),
    }),
  )
})
it('can proxy a many layered object', async () => {
  interface SillyRecursive extends IHandlerMap {
    silly: SillyRecursive
    get: Get
  }
  const options: IRpcOptions = { timeout: 12345 }
  const base = getClient<SillyRecursive>(
    CqrsType.Query,
    mockTransport,
    options,
  )
  const args = ['thing'] as [string]
  // 10 silly!
  await base.silly.silly.silly.silly.silly.silly.silly.silly.silly.silly.get(
    ...args,
  )

  expect(mockTransport.publish).toHaveBeenCalledTimes(1)
  expect(mockTransport.publish).toHaveBeenLastCalledWith(
    expect.objectContaining<IPublishProps<IRpcMetadata, string>>({
      message: encodeRpc(args),
      metadata: expect.objectContaining<IRpcMetadata>({
        // iso regex!
        callTime: expect.any(String),
      }),
      route: constructRouteKey({
        busType: CqrsType.Query,
        functionName: [...Array(10).fill('silly'), 'get'],
      }),
      rpc: expect.objectContaining(options),
    }),
  )
})
