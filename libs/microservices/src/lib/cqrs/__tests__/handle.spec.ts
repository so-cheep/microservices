import * as faker from 'faker'
import { mocked } from 'ts-jest/utils'
import { constructRouteKey } from '../../utils/constructRouteKey'
import { encodeRpc } from '../../utils/encodeRpc'
import { mockTransport } from '../../__mocks__/transport'
import { CqrsType } from '../constants'
import { handleCqrsSingle } from '../handleCqrs'
import { CqrsApi, HandlerMap } from '../types'
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

beforeEach(() => {
  jest.clearAllMocks()
})

describe('handler tests', () => {
  it('can handle object with functions', async () => {
    const mockUser = { name: faker.name.findName() }
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

    const routeKey = constructRouteKey({
      busType: CqrsType.Query,
      moduleName: 'TestUser',
      functionName: 'getById',
    })

    expect(mockTransport.on).toHaveBeenCalledTimes(1)
    expect(mockTransport.on).toHaveBeenLastCalledWith(
      routeKey,
      expect.any(Function),
    )

    // let's call the handler now
    const routeHandler = mocked(mockTransport.on).mock.calls[0][1]

    const result = await routeHandler({
      message: id,
      metadata: metadata,
      route: routeKey,
    })

    expect(mockGet).toHaveBeenCalledTimes(1)
    // function should be called with metadata as well!
    expect(mockGet).toHaveBeenLastCalledWith(id, metadata)
    expect(result).toMatchObject(mockUser)
  })

  it('can handle nested object with functions', async () => {
    const api = { users: userService }
    const mockUser = { name: faker.name.findName() }

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

    const routeKey = constructRouteKey({
      busType: CqrsType.Query,
      moduleName: <Api['namespace']>'TestUser',
      functionName: ([
        'users',
        'getById',
      ] as (keyof UserService)[]) as string[],
    })

    expect(mockTransport.on).toHaveBeenCalledTimes(1)
    expect(mockTransport.on).toHaveBeenLastCalledWith(
      routeKey,
      expect.any(Function),
    )

    // let's call the handler now
    const routeHandler = mocked(mockTransport.on).mock.calls[0][1]

    const result = await routeHandler({
      message: id,
      metadata: metadata,
      route: routeKey,
    })

    expect(mockGet).toHaveBeenCalledTimes(1)
    // function should be called with metadata as well!
    expect(mockGet).toHaveBeenLastCalledWith(id, metadata)
    expect(result).toMatchObject(mockUser)
  })
})
