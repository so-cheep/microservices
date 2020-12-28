import { HandlerMap, RpcMetadata } from '../types'
import { handle } from '../handle'
import { CqrsType } from '../constants'
import { mockTransport } from '../__mocks__/transport'
import { TransportItem } from '../../../../types/src'
import { encodeRpc } from '../utils/encodeRpc'
import { constructRouteKey } from '../utils/constructRouteKey'
import { Subject } from 'rxjs'
import * as faker from 'faker'
interface User {
  name: string
}

interface UserService extends HandlerMap {
  getById: (id: string) => Promise<User>
}

const mockGet = jest.fn().mockResolvedValue({})
const userService: UserService = {
  // we have to put the jest mock INSIDE the getById definition so that we can use `getById` to build handler
  getById: (...args) => mockGet(...args),
}
const message$ = (mockTransport.message$ as unknown) as Subject<
  TransportItem<RpcMetadata, string>
>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('handler tests', () => {
  it('can handle object with functions', done => {
    const mockUser = { name: faker.name.findName() }
    const mockComplete = jest.fn()
    const mockReturn = jest.fn()
    mockGet.mockResolvedValueOnce(mockUser)
    const id = 'some-id'
    const metadata = {
      callTime: new Date().toISOString(),
      originModule: '',
    }
    handle(CqrsType.Query, mockTransport, userService)

    message$.next({
      complete: mockComplete,
      sendReply: mockReturn,
      message: encodeRpc(id),
      metadata: metadata,
      route: constructRouteKey({
        busType: CqrsType.Query,
        moduleName: mockTransport.moduleName,
        functionName: ([
          'getById',
        ] as (keyof UserService)[]) as string[],
      }),
    })

    expect(mockGet).toHaveBeenCalledTimes(1)
    // function should be called with metadata as well!
    expect(mockGet).toHaveBeenLastCalledWith(id, metadata)
    expect(mockComplete).toHaveBeenCalledTimes(1)
    expect(mockComplete).toHaveBeenLastCalledWith(true)

    // have to set immediate to get the return of the async fn
    setImmediate(() => {
      expect(mockReturn).toHaveBeenCalledTimes(1)
      expect(mockReturn).toHaveBeenLastCalledWith(
        // handler should encode return value for rpc!
        encodeRpc(mockUser),
        expect.objectContaining(metadata),
      )
      done()
    })
  })

  it('can handle nested object with functions', done => {
    const api = { users: userService }
    const mockUser = { name: faker.name.findName() }
    const mockComplete = jest.fn()
    const mockReturn = jest.fn()
    mockGet.mockResolvedValueOnce(mockUser)
    const id = 'some-id'
    const metadata = {
      callTime: new Date().toISOString(),
      originModule: '',
    }

    handle(CqrsType.Query, mockTransport, api)

    message$.next({
      complete: mockComplete,
      sendReply: mockReturn,
      message: encodeRpc(id),
      metadata: metadata,
      route: constructRouteKey({
        busType: CqrsType.Query,
        moduleName: mockTransport.moduleName,
        functionName: ([
          'users',
          'getById',
        ] as (keyof UserService)[]) as string[],
      }),
    })

    expect(mockGet).toHaveBeenCalledTimes(1)
    // function should be called with metadata as well!
    expect(mockGet).toHaveBeenLastCalledWith(id, metadata)
    expect(mockComplete).toHaveBeenCalledTimes(1)
    expect(mockComplete).toHaveBeenLastCalledWith(true)

    // have to set immediate to get the return of the async fn
    setImmediate(() => {
      expect(mockReturn).toHaveBeenCalledTimes(1)
      expect(mockReturn).toHaveBeenLastCalledWith(
        encodeRpc(mockUser),
        expect.objectContaining(metadata),
      )
      done()
    })
  })
})
