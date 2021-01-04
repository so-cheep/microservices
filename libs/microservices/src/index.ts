export type { MicroserviceApi } from './lib/types'

// CQRS Exports
export {
  handleCqrsApi,
  handleCqrsSingle,
  getCqrsClient,
} from './lib/cqrs'
export { CqrsType } from './lib/cqrs/constants'
export type {
  Handler,
  QueryMap,
  CommandMap,
  CqrsApi,
  ClientApi,
  RpcMetadata,
  RpcOptions,
} from './lib/cqrs/types'

// Event Exports
export { getEventPublisher, handleEvents } from './lib/events'
export type {
  EventMap,
  EventApi,
  EventHandler,
  EventPublisher,
  EventBase,
  AllEventsMap,
  EventWithMetadata,
} from './lib/events/types'
