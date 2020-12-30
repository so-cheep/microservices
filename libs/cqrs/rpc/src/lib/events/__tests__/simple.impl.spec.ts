import { MemoryTransport } from '@nx-cqrs/cqrs/types'
import { handleEventsWithAck } from '../eventHandlerFactory'
import { getEventPublisher } from '../getEventPublisher'
import {
  Api2,
  User,
  UserApi,
  UserDeleteEvent,
  UserEvent,
  UserUpdateEvent,
} from './mockApi'

let transport: MemoryTransport
const userCreateHandler = jest.fn()
const userUpdateHandler = jest.fn()

describe('simple implementation', () => {
  beforeEach(() => {
    transport = new MemoryTransport({ moduleName: 'TEST' })
  })
  it('works', () => {
    // handling service USER
    const userEvents = handleEventsWithAck<UserApi | Api2>(transport)

    userEvents.handleFunction(
      e => e.User.created,
      payload => {
        userCreateHandler(payload)
      },
    )

    userEvents.handleClass(
      [UserUpdateEvent, UserDeleteEvent],
      (payload: UserEvent) => {
        userUpdateHandler(payload)
      },
    )

    // make a caller USER

    const publish = getEventPublisher<UserApi>(transport)

    const user: User = {
      id: 12345,
      name: 'kyle',
    }
    publish.User.created(user)

    expect(userCreateHandler).toHaveBeenCalledTimes(1)
    expect(userCreateHandler).toHaveBeenLastCalledWith(user)

    publish(new UserUpdateEvent(user))

    expect(userUpdateHandler).toHaveBeenCalledTimes(1)
    expect(userUpdateHandler).toHaveBeenLastCalledWith({ user })
  })
})
