import {
  CommandMap,
  EventMap,
  EventPublisher,
  getEventPublisher,
  MicroserviceApi,
  QueryMap,
} from '@cheep/microservices'
import { Transport } from '@cheep/transport'
import { Inject, Injectable } from '@nestjs/common'
import { TransportToken } from '../constants'

@Injectable()
export class EventPublisherService<
  TApi extends MicroserviceApi<string, QueryMap, CommandMap, EventMap>
> {
  constructor(@Inject(TransportToken) private transport: Transport) {}

  get publish(): EventPublisher<TApi> {
    return getEventPublisher(this.transport)
  }
}
