import { mockTransport } from '../../__mocks__/transport'
import { getEventPublisher } from '../getEventPublisher'
import { Api1, DomainUpdateEvent, User } from './mockApi'
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
    const publish = getEventPublisher<Api1>(mockTransport)

    const user: User = {
      id: 1,
      name: faker.name.findName(),
    }

    publish.User.create(user)

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
    const publish = getEventPublisher<Api1>(mockTransport)

    const user: User = {
      id: 1,
      name: faker.name.findName(),
    }

    publish(new DomainUpdateEvent(user))

    expect(mockTransport.publish).toHaveBeenCalledTimes(1)

    const publishCallArg = mocked(mockTransport.publish)
      .mock.calls.slice(-1)
      .pop()[0]
    expect(publishCallArg.route).toMatch(
      getClassEventRoute(DomainUpdateEvent),
    )
    expect(publishCallArg.message).toMatch(encodeRpc({ user }))
  })
})
