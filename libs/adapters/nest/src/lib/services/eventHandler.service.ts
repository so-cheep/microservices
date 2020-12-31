/* eslint-disable @typescript-eslint/no-explicit-any */
// anys are ok here, this is a dummy type
import { Injectable } from '@nestjs/common'

import type {
  CommandMap,
  EventMap,
  MicroserviceApi,
  QueryMap,
  EventHandler as EventHandlerType,
} from '@cheep/microservices'

@Injectable()
export class EventHandlerService<
  TApi extends MicroserviceApi<string, QueryMap, CommandMap, EventMap>
> implements EventHandlerType<TApi> {
  event$: any
  handleClass: any
  handleFunction: any
}
