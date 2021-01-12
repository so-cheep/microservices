import {
  MemoryTransport,
  RemoteError,
  RpcTimeoutError,
  Transport,
} from '@cheep/transport'
import * as faker from 'faker'
import { decodeRpc } from '../../utils/decodeRpc'
import { encodeRpc } from '../../utils/encodeRpc'
import { getCqrsClient } from '../getCqrsClient'
import { handleCqrsApi } from '../handleCqrs'
import { ClientApi, CqrsApi, HandlerMap } from '../types'
import { v4 as uuid } from 'uuid'
interface User {
  name: string
  id: number
}

interface Queries extends HandlerMap {
  getById: (props: { id: number }) => Promise<User>
  getAll: () => Promise<User[]>
  validation: {
    login: (props: {
      id: number
      password: string
    }) => Promise<boolean>
  }

  notMockedWillThrow: () => Promise<void>
}

const users = Array(10)
  .fill(null)
  .map((_, idx): User => ({ id: idx, name: faker.name.findName() }))

class UserNotFoundError extends Error {
  public readonly code = 'USER_NOT_FOUND'
}
const queryHandler: Queries = {
  getById: jest.fn(({ id }: { id: number }) => {
    const user = users.find(u => u.id === id)
    if (!user) {
      throw new UserNotFoundError()
    }
    return Promise.resolve(user)
  }),
  getAll: jest.fn().mockResolvedValue(users),
  validation: {
    login: jest.fn(props =>
      Promise.resolve(
        !!users.find(u => u.id === props.id) && !!props.password,
      ),
    ),
  },
  notMockedWillThrow: async () => {
    throw new UserNotFoundError()
  },
}

type Api = CqrsApi<
  'Users',
  Queries,
  { create: (props: { name: string }) => Promise<void> }
>

const api: Api = {
  namespace: 'Users',
  Command: {
    create: jest.fn().mockResolvedValue(undefined),
  },
  Query: queryHandler,
}

let transport: Transport, apiClient: ClientApi<Api>
beforeEach(async () => {
  transport = new MemoryTransport(
    { defaultRpcTimeout: 5000, messageDelayTime: 0 },
    { jsonDecode: decodeRpc, jsonEncode: encodeRpc, newId: uuid },
  )
  await transport.init()
  handleCqrsApi(transport, api)

  apiClient = getCqrsClient<Api>(transport, {
    timeout: 5000,
  })

  await transport.start()
  jest.clearAllMocks()
})

afterEach(() => transport.dispose())

describe('simple implementation tests', () => {
  it('calls functions with arguments', async () => {
    const id = faker.random.number({ min: 0, max: users.length })
    const user = await apiClient.Query.Users.getById({ id })
    expect(queryHandler.getById).toHaveBeenCalledTimes(1)
    expect(queryHandler.getById).toHaveBeenLastCalledWith(
      { id },
      expect.any(Object),
    )
    // check the return value, too!
    expect(user).toMatchObject(users[id])
  })

  it('calls functions without arguments', async () => {
    const allUsers = await apiClient.Query.Users.getAll()

    expect(queryHandler.getAll).toHaveBeenCalledTimes(1)
    expect(allUsers).toMatchObject(users)
  })

  it('calls functions which are nested', async () => {
    const id = faker.random.number({ min: 0, max: users.length })

    const result = await apiClient.Query.Users.validation.login({
      id,
      password: 'something',
    })
    expect(queryHandler.validation.login).toHaveBeenCalledTimes(1)
    expect(result).toBeTruthy()
  })

  it('passes errors from the handler to the caller', async () => {
    await expect(() =>
      apiClient.Query.Users.getById({ id: users.length + 1 }),
    ).rejects.toThrow(
      expect.objectContaining<Partial<RemoteError>>({
        className: 'UserNotFoundError',
      }),
    )
  })

  it('passes errors from the handler to the caller (non-mocked variation, to confirm)', async () => {
    await expect(() =>
      apiClient.Query.Users.notMockedWillThrow(),
    ).rejects.toThrow(
      expect.objectContaining<Partial<RemoteError>>({
        className: 'UserNotFoundError',
      }),
    )
  })

  it('throws a timeout error when calling unhandled', async () => {
    await expect(() =>
      apiClient.Query.Users.validation['thisDoesntExist']({
        fake: 1234,
      }),
    ).rejects.toThrow(RpcTimeoutError)
  })
})
