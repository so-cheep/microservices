export type { MicroserviceApi } from './lib/types'

// CQRS Exports
export {
  handleCqrsApi,
  handleCqrsSingle,
  getCqrsClient,
} from './lib/cqrs'
export type {
  QueryMap,
  CommandMap,
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
  EventBase,
  AllEventsMap,
  EventWithMetadata,
} from './lib/events/types'
