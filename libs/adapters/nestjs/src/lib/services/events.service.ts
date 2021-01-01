/* eslint-disable @typescript-eslint/no-explicit-any */
// anys are ok here, this is a dummy type
import { Inject, Injectable, OnModuleInit } from '@nestjs/common'

import {
  EventHandler as EventHandlerType,
  EventPublisher,
  handleEvents,
  EventHandler,
  RpcMetadata,
  getEventPublisher,
} from '@cheep/microservices'
import { ModuleOptionsToken, TransportToken } from '../constants'
import type { Transport } from '@cheep/transport'
import { GenericMicroserviceApi } from '../types'

/**
 * Provides access to handling and publishing events using Cheep
 *
 * @argument THandleableApi - api type union for events to be handled
 * @argument TPublishableApi - api type for events to be published
 */
@Injectable()
export class CheepEvents<
  THandleableApi extends GenericMicroserviceApi = never,
  TPublishableApi extends GenericMicroserviceApi = never
> implements EventHandlerType<THandleableApi>, OnModuleInit {
  private eventHandler: EventHandler<THandleableApi>
  private eventPublisher: EventPublisher<TPublishableApi>

  get handleClass(): EventHandlerType<THandleableApi>['handleClass'] {
    return this.eventHandler.handleClass
  }

  get on(): EventHandlerType<THandleableApi>['on'] {
    return this.eventHandler.on
  }

  get event$(): EventHandlerType<THandleableApi>['event$'] {
    return this.eventHandler.event$
  }

  get publish(): EventPublisher<TPublishableApi> {
    return this.eventPublisher
  }

  constructor(
    @Inject(TransportToken) private transport: Transport<RpcMetadata>,
    @Inject(ModuleOptionsToken) private moduleOptions,
  ) {}

  onModuleInit() {
    this.eventPublisher = getEventPublisher<TPublishableApi>(
      this.transport,
    )
    this.eventHandler = handleEvents<THandleableApi>(
      this.transport,
      this.moduleOptions.listenEventsFrom,
    )
  }
}
