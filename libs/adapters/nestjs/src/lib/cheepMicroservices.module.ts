import {
  Module,
  DynamicModule,
  OnModuleInit,
  Inject,
  Type,
} from '@nestjs/common'

import type {
  CheepMicroservicesModuleConfig,
  CheepMicroservicesRootConfig,
} from './types'
import { ModuleConfigToken } from './constants'
import { CheepApi } from './services/api.service'
import { CheepEvents } from './services/events.service'
import { CqrsHandlerRegistryService } from './services/cqrsHandlerRegistry.service'
import { CheepTransportModule } from './modules/core/cheepTransport.module'
import type { TransportBase } from '@cheep/transport'
import { TransportApi, transportHandler } from '@cheep/transport-api'
import { getLeafAddresses } from './util/getLeafAddresses'
import { Module } from '@nestjs/core/injector/module'
import { ModuleRef } from '@nestjs/core'

@Module({})
export class CheepMicroservicesModule<
  TModuleApi extends TransportApi,
  TRemoteApi extends TransportApi
> implements OnModuleInit {
  static forRoot(
    options: CheepMicroservicesRootConfig,
  ): DynamicModule {
    options.transport.init()
    return {
      module: CheepMicroservicesModule,
      imports: [CheepTransportModule.forRoot(options.transport)],
    }
  }

  static forModule<
    TModuleApi extends TransportApi,
    TRemoteApi extends TransportApi
  >(
    config: CheepMicroservicesModuleConfig<TModuleApi, TRemoteApi>,
  ): DynamicModule {
    return {
      module: CheepMicroservicesModule,
      providers: [
        CqrsHandlerRegistryService,
        CheepEvents,
        CheepApi,
        {
          provide: ModuleConfigToken,
          useValue: config,
        },
      ],
      exports: [CheepEvents, CheepApi],
    }
  }

  constructor(
    private transport: TransportBase,
    @Inject(ModuleConfigToken)
    private config: CheepMicroservicesModuleConfig<
      TModuleApi,
      TRemoteApi
    >,
    private moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    // const handler = transportHandler<TModuleApi | TRemoteApi>(
    //   this.transport,
    //   this.config,
    // )
    // reduce handlers to array of [path, handler]
    const leaves = getLeafAddresses(this.config.handlers)
    for (const [path, leaf] of leaves) {
      // check dep injection
      const service = this.moduleRef
        .get(leaf as Type, { strict: false })
        .catch(() => undefined)

      if (service) {
        const methods = Object.getPrototypeOf(service)
        this.transport.on(path.join(this.config.joinSymbol))
      }
    }
    // call
  }
}
