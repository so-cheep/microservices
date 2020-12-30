import { mockTransport } from '../../__mocks__/transport'
import { getEventPublisher } from '../getEventPublisher'
import { UserApi, UserUpdateEvent, User } from './mockApi'
import * as faker from 'faker'
import { encodeRpc } from '../../utils/encodeRpc'
import { EventRouteKey } from '../constants'
import { getClassEventRoute } from '../utils/getClassEventRoute'
import { mocked } from 'ts-jest/utils'

describe('get publisher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  it('works with a basic api', () => {
    const publish = getEventPublisher<UserApi>(mockTransport)

    const user: User = {
      id: 1,
      name: faker.name.findName(),
    }

    publish.User.created(user)

    expect(mockTransport.publish).toHaveBeenCalledTimes(1)
    const publishCallArg = mocked(mockTransport.publish)
      .mock.calls.slice(-1)
      .pop()[0]
    expect(publishCallArg.route).toMatch(
      `${EventRouteKey}.User.create`,
    )
    expect(publishCallArg.message).toMatch(encodeRpc(user))
  })

  it('works with a class based event', () => {
    const publish = getEventPublisher<UserApi>(mockTransport)

    const user: User = {
      id: 1,
      name: faker.name.findName(),
    }

    publish(new UserUpdateEvent(user))

    expect(mockTransport.publish).toHaveBeenCalledTimes(1)

    const publishCallArg = mocked(mockTransport.publish)
      .mock.calls.slice(-1)
      .pop()[0]
    expect(publishCallArg.route).toMatch(
      getClassEventRoute(UserUpdateEvent),
    )
    expect(publishCallArg.message).toMatch(encodeRpc({ user }))
  })
})
