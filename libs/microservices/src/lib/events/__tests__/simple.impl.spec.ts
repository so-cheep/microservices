import { MemoryTransport } from '@cheep/transport'
import { handleEvents } from '../eventHandlerFactory'
import { getEventPublisher } from '../getEventPublisher'
import { Api2, User, UserApi } from '../../__mocks__/mockApi'
import { cold } from 'jest-marbles'
import { Observable } from 'rxjs'
import { decodeRpc } from '../../utils/decodeRpc'
import { encodeRpc } from '../../utils/encodeRpc'
import { v4 as uuid } from 'uuid'

let transport: MemoryTransport
const userCreateHandler = jest.fn()
const userUpdateHandler = jest.fn()

let userEvent$: Observable<unknown>

describe('simple implementation', () => {
  beforeEach(async () => {
    await transport?.dispose()
    transport = new MemoryTransport(
      {},
      { jsonDecode: decodeRpc, jsonEncode: encodeRpc, newId: uuid },
    )
    await transport.init()

    const userEvents = handleEvents<UserApi | Api2>(transport, [
      'User',
    ])

    // set handlers
    userEvents.on(
      e => e.User.created,
      x => userCreateHandler(x),
    )
    userEvents.on(
      e => e.User.updated,
      x => userUpdateHandler(x),
    )
    userEvent$ = userEvents.observe()

    await transport.start()
    jest.clearAllMocks()
  })

  // can't use afterEach, it breaks the marble tests
  afterAll(async () => await transport.dispose())

  it('calls functional handlers', () => {
    // make a caller USER

    const publish = getEventPublisher<UserApi>(transport)

    const user: User = {
      id: 12345,
      name: 'kyle',
    }

    publish.User.created(user)
    expect(userCreateHandler).toHaveBeenCalledTimes(1)
    expect(userCreateHandler).toHaveBeenLastCalledWith(user)

    publish.User.updated(user)
    expect(userUpdateHandler).toHaveBeenCalledTimes(1)
    expect(userUpdateHandler).toHaveBeenLastCalledWith(user)
    // doing this here because doing it in the afterEach breaks the marble tests
    transport.dispose()
  })

  it('returns a valid observable', () => {
    // make a caller USER

    const publish = getEventPublisher<UserApi>(transport)

    const user: User = {
      id: 12345,
      name: 'kyle',
    }

    cold('-0-1', ['created', 'updated']).subscribe(action => {
      publish.User[action](user)
    })

    expect(userEvent$).toBeObservable(
      cold('-0-1-', [
        {
          payload: user,
          type: ['User', 'created'],
          metadata: expect.objectContaining({}),
          route: 'Events.User.created',
        },
        {
          payload: user,
          type: ['User', 'updated'],
          metadata: expect.objectContaining({}),
          route: 'Events.User.updated',
        },
      ]),
    )
  })
})
