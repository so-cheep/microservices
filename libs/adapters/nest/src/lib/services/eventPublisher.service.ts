import { Inject, Injectable } from '@nestjs/common'

import {
  CommandMap,
  EventMap,
  MicroserviceApi,
  QueryMap,
  EventPublisher,
  getEventPublisher,
} from '@cheep/microservices'
import { TransportToken } from '../constants'
import { Transport } from '@cheep/transport/shared'

@Injectable()
export class EventPublisherService<
  TApi extends MicroserviceApi<string, QueryMap, CommandMap, EventMap>
> {
  constructor(@Inject(TransportToken) private transport: Transport) {}

  get publish(): EventPublisher<TApi> {
    return getEventPublisher(this.transport)
  }
}
