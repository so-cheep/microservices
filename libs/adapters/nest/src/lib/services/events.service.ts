/* eslint-disable @typescript-eslint/no-explicit-any */
// anys are ok here, this is a dummy type
import { Inject, Injectable, OnModuleInit } from '@nestjs/common'

import {
  CommandMap,
  EventMap,
  MicroserviceApi,
  QueryMap,
  EventHandler as EventHandlerType,
  EventPublisher,
  handleEvents,
  EventHandler,
  RpcMetadata,
  getEventPublisher,
} from '@cheep/microservices'
import { ModuleOptionsToken, TransportToken } from '../constants'
import type { Transport } from '@cheep/transport'

@Injectable()
export class CheepEvents<
  TApi extends MicroserviceApi<string, QueryMap, CommandMap, EventMap>
> implements EventHandlerType<TApi>, OnModuleInit {
  private eventHandler: EventHandler<TApi>
  private eventPublisher: EventPublisher<TApi>

  get handleClass(): EventHandlerType<TApi>['handleClass'] {
    return this.eventHandler.handleClass
  }

  get on(): EventHandlerType<TApi>['on'] {
    return this.eventHandler.on
  }

  get event$(): EventHandlerType<TApi>['event$'] {
    return this.eventHandler.event$
  }

  get publish(): EventPublisher<TApi> {
    return this.eventPublisher
  }

  constructor(
    @Inject(TransportToken) private transport: Transport<RpcMetadata>,
    @Inject(ModuleOptionsToken) private moduleOptions,
  ) {}

  onModuleInit() {
    this.eventPublisher = getEventPublisher(this.transport)
    this.eventHandler = handleEvents<TApi>(
      this.transport,
      this.moduleOptions.listenEventsFrom,
    )
  }
}
