import { UserUpdateEvent } from '../../__tests__/mockApi'
import { getInstanceEventRoute } from '../getInstanceEventRoute'

describe('get instance event route', () => {
  it('follows the prototype chain', () => {
    const route = getInstanceEventRoute(
      new UserUpdateEvent({ id: 1234, name: 'bob' }),
    )
    expect(route).toMatchObject([
      'User',
      'BaseEvent',
      'UserEvent',
      'UserUpdateEvent',
    ])
  })
})
