import { Injectable } from '@nestjs/common'

import type {
  CommandMap,
  EventMap,
  MicroserviceApi,
  QueryMap,
  ClientApi,
} from '@cheep/microservices'

@Injectable()
export class CqrsClientService<
  TApi extends MicroserviceApi<string, QueryMap, CommandMap, EventMap>
> implements ClientApi<TApi> {
  Query: ClientApi<TApi>['Query']
  Command: ClientApi<TApi>['Command']
}
