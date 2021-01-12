import * as faker from 'faker'
import { mocked } from 'ts-jest/utils'

import { mockTransport } from '../../__mocks__/transport'
import { EventRouteKey } from '../constants'
import { getEventPublisher } from '../getEventPublisher'
import { User, UserApi } from '../../__mocks__/mockApi'

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
    expect(publishCallArg.message).toMatchObject([user])
  })
})
