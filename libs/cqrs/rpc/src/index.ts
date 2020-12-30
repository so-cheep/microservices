export { EventApi, getEventPublisher } from './lib/events'
export { handleEvents } from './lib/events/eventHandlerFactory'

export { handleCqrsApi, handleCqrsSingle } from './lib/handleCqrs'
export { getCqrsClient } from './lib/getCqrsClient'
export {
  CqrsApi,
  HandlerMap as IHandlerMap,
  MicroserviceApi,
} from './lib/types'
