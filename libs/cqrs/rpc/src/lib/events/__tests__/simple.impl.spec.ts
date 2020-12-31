import { MemoryTransport } from '@cheep/transport'
import { handleEvents } from '../eventHandlerFactory'
import { getEventPublisher } from '../getEventPublisher'
import {
  Api2,
  User,
  UserApi,
  UserDeleteEvent,
  UserEvent,
  UserUpdateEvent,
} from './mockApi'
import { cold } from 'jest-marbles'
import { AllEventsMap, EventWithMetadata } from '../types'
import { map } from 'rxjs/operators'
import { getClassEventRoute } from '../utils/getClassEventRoute'
import { Observable } from 'rxjs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transport: MemoryTransport
const userCreateHandler = jest.fn()
const userUpdateHandler = jest.fn()

let userEvent$: Observable<unknown>

describe('simple implementation', () => {
  beforeEach(() => {
    transport = new MemoryTransport({ moduleName: 'TEST' })
    // handling service USER
    const userEvents = handleEvents<UserApi | Api2>(
      transport as any,
      ['User'],
    )

    userEvents.handleFunction(
      e => e.User.created,
      payload => {
        userCreateHandler(payload)
      },
    )

    userEvents.handleClass(UserUpdateEvent, (payload: UserEvent) => {
      userUpdateHandler(payload)
    })

    userEvent$ = userEvents.event$
    jest.clearAllMocks()
  })
  it('works', () => {
    // make a caller USER

    const publish = getEventPublisher<UserApi>(transport)

    const user: User = {
      id: 12345,
      name: 'kyle',
    }

    const pub$ = cold('-0-1', [
      () => publish.User.created(user),
      () => publish(new UserUpdateEvent(user)),
    ]).pipe(
      map(action => {
        action()
      }),
    )

    expect(userEvent$).toBeObservable(
      cold('-0-1-', [
        {
          payload: user,
          type: ['User', 'created'],
          metadata: expect.objectContaining({}),
        } as AllEventsMap<UserApi>,
        {
          payload: expect.objectContaining(new UserUpdateEvent(user)),
          type: getClassEventRoute(UserUpdateEvent),
          metadata: expect.objectContaining({}),
        } as AllEventsMap<UserApi>,
      ]),
    )

    expect(pub$).toSatisfyOnFlush(() => {
      expect(userCreateHandler).toHaveBeenCalledTimes(1)
      expect(userCreateHandler).toHaveBeenLastCalledWith(user)

      expect(userUpdateHandler).toHaveBeenCalledTimes(1)
      expect(userUpdateHandler).toHaveBeenLastCalledWith({ user })
    })
  })
})
