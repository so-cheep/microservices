/* eslint-disable @typescript-eslint/no-explicit-any */
// anys are ok here, this is a dummy type
import { Inject, Injectable, OnModuleInit } from '@nestjs/common'

import {
  EventHandler as EventHandlerType,
  EventPublisher,
  handleEvents,
  EventHandler,
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

  // get handleClass(): EventHandlerType<THandleableApi>['handleClass'] {
  //   return this.eventHandler.handleClass
  // }

  get on(): EventHandlerType<THandleableApi>['on'] {
    return this.eventHandler.on
  }

  get observe(): EventHandlerType<THandleableApi>['observe'] {
    return this.eventHandler.observe
  }

  get publish(): EventPublisher<TPublishableApi> {
    return this.eventPublisher
  }

  constructor(
    @Inject(TransportToken) private transport: Transport,
    @Inject(ModuleOptionsToken) private moduleOptions,
  ) {}

  onModuleInit() {
    this.eventPublisher = getEventPublisher<TPublishableApi>(
      this.transport,
    )

    // always get our own events!
    const listenModules = (
      this.moduleOptions.listenEventsFrom ?? []
    ).concat([this.moduleOptions.moduleName])

    this.eventHandler = handleEvents<THandleableApi>(
      this.transport,
      listenModules,
    )
  }
}
