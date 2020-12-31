import { TransportItem } from '@cheep/transport'
import * as faker from 'faker'
import { Subject } from 'rxjs'
import { constructRouteKey } from '../../utils/constructRouteKey'
import { encodeRpc } from '../../utils/encodeRpc'
import { mockTransport } from '../../__mocks__/transport'
import { CqrsType } from '../constants'
import { handleCqrsSingle } from '../handleCqrs'
import { CqrsApi, HandlerMap, RpcMetadata } from '../types'
interface User {
  name: string
}

interface UserService extends HandlerMap {
  getById: (id: string) => Promise<User>
}

type Api = CqrsApi<'TestUser', UserService, HandlerMap>

const mockGet = jest.fn().mockResolvedValue({})
const userService: UserService = {
  // we have to put the jest mock INSIDE the getById definition so that we can use `getById` to build handler
  getById: (...args) => mockGet(...args),
}
const message$ = (mockTransport.message$ as unknown) as Subject<
  TransportItem<RpcMetadata>
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
    handleCqrsSingle<Api>(
      CqrsType.Query,
      mockTransport,
      userService,
      'TestUser',
    )

    message$.next({
      complete: mockComplete,
      sendReply: mockReturn,
      sendErrorReply: jest.fn(),
      message: encodeRpc(id),
      metadata: metadata,
      route: constructRouteKey({
        busType: CqrsType.Query,
        moduleName: <Api['namespace']>'TestUser',
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

    handleCqrsSingle<Api>(
      CqrsType.Query,
      mockTransport,
      api,
      'TestUser',
    )

    message$.next({
      complete: mockComplete,
      sendReply: mockReturn,
      sendErrorReply: jest.fn(),
      message: encodeRpc(id),
      metadata: metadata,
      route: constructRouteKey({
        busType: CqrsType.Query,
        moduleName: <Api['namespace']>'TestUser',
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
