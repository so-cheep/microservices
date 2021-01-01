import { Inject, Injectable, OnModuleInit } from '@nestjs/common'

import {
  CommandMap,
  EventMap,
  MicroserviceApi,
  QueryMap,
  ClientApi,
  getCqrsClient,
  RpcMetadata,
} from '@cheep/microservices'
import type { Transport } from '@cheep/transport'

import { TransportToken } from '../constants'

@Injectable()
export class CheepApi<
  TApi extends MicroserviceApi<string, QueryMap, CommandMap, EventMap>
> implements ClientApi<TApi>, OnModuleInit {
  private client: ClientApi<TApi>

  get Query(): ClientApi<TApi>['Query'] {
    return this.client.Query
  }
  get Command(): ClientApi<TApi>['Command'] {
    return this.client.Command
  }

  constructor(
    @Inject(TransportToken) private transport: Transport<RpcMetadata>,
  ) {}

  onModuleInit() {
    this.client = getCqrsClient(this.transport)
  }
}
