import * as faker from 'faker'

import {
  MemoryTransport,
  ITransport,
  RpcTimeoutError,
} from '@nx-cqrs/cqrs/types'

import { getQueryClient, handleQuery } from '../query'
import { IHandlerMap } from '../types'

interface User {
  name: string
  id: number
}

interface QueryApi extends IHandlerMap {
  users: {
    getById: (props: { id: number }) => Promise<User>
    getAll: () => Promise<User[]>
    validation: {
      login: (props: {
        id: number
        password: string
      }) => Promise<boolean>
    }
  }
  notMockedWillThrow: () => Promise<void>
}

const users = Array(10)
  .fill(null)
  .map((_, idx): User => ({ id: idx, name: faker.name.findName() }))

class UserNotFoundError extends Error {
  public readonly code = 'USER_NOT_FOUND'
}
const queryHandler: QueryApi = {
  users: {
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
  },
  notMockedWillThrow: async () => {
    throw new UserNotFoundError()
  },
}

let transport: ITransport, apiClient: QueryApi
beforeEach(() => {
  transport = new MemoryTransport({ moduleName: 'TESTING' })
  handleQuery(transport, queryHandler)

  apiClient = getQueryClient<QueryApi>(transport, {
    timeout: 5000,
  })

  jest.clearAllMocks()
})

afterEach(() => transport.dispose())

describe('simple implementation tests', () => {
  it('calls functions with arguments', async () => {
    const id = faker.random.number({ min: 0, max: users.length })
    const user = await apiClient.users.getById({ id })

    expect(queryHandler.users.getById).toHaveBeenCalledTimes(1)
    expect(queryHandler.users.getById).toHaveBeenLastCalledWith(
      { id },
      expect.any(Object),
    )
    // check the return value, too!
    expect(user).toMatchObject(users[id])
  })

  it('calls functions without arguments', async () => {
    const allUsers = await apiClient.users.getAll()

    expect(queryHandler.users.getAll).toHaveBeenCalledTimes(1)
    expect(allUsers).toMatchObject(users)
  })

  it('calls functions which are nested', async () => {
    const id = faker.random.number({ min: 0, max: users.length })

    const result = await apiClient.users.validation.login({
      id,
      password: 'something',
    })
    expect(queryHandler.users.validation.login).toHaveBeenCalledTimes(
      1,
    )
    expect(result).toBeTruthy()
  })

  it('passes errors from the handler to the caller', async () => {
    await expect(() =>
      apiClient.users.getById({ id: users.length + 1 }),
    ).rejects.toThrow(UserNotFoundError)
  })

  it('passes errors from the handler to the caller (non-mocked variation, to confirm)', async () => {
    await expect(() =>
      apiClient.notMockedWillThrow(),
    ).rejects.toThrow(UserNotFoundError)
  })

  it('throws a timeout error when calling unhandled', async () => {
    await expect(() =>
      apiClient.users['thisDoesntExist']({ fake: 1234 }),
    ).rejects.toThrow(RpcTimeoutError)
  })
})
