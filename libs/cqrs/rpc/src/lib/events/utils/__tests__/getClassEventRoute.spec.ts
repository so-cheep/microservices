import {
  EventNamespaceMetadataKey,
  EventRouteKey,
} from '../../constants'
import { getClassEventRoute } from '../getClassEventRoute'

class BaseEvent {}

class DomainObjectEvent extends BaseEvent {}
class DomainUpdateEvent extends DomainObjectEvent {}

Reflect.defineMetadata(
  EventNamespaceMetadataKey,
  'TEST',
  DomainObjectEvent,
)

describe('get class event route', () => {
  it('follows the prototype chain', () => {
    const route = getClassEventRoute(DomainUpdateEvent)
    expect(route).toMatch(
      `TEST.BaseEvent.DomainObjectEvent.DomainUpdateEvent`,
    )
  })
})
