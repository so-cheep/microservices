import {
  Module,
  DynamicModule,
  OnModuleInit,
  Inject,
} from '@nestjs/common'

import type {
  CheepMicroservicesModuleConfig,
  CheepMicroservicesRootConfig,
} from './types'
import { ModuleConfigToken, RootOptionsToken } from './constants'
import { CheepApi } from './services/api.service'
import { CheepEvents } from './services/events.service'
import { CqrsHandlerRegistryService } from './services/cqrsHandlerRegistry.service'
import { CheepTransportModule } from './modules/core/cheepTransport.module'
import type { Transport, TransportBase } from '@cheep/transport'
import { TransportApi, transportHandler } from '@cheep/transport-api'

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
  ) {}

  onModuleInit() {
    const handler = transportHandler<TModuleApi | TRemoteApi>(
      this.transport,
      this.config,
    )
    // reduce handlers to array of [path, handler]

    // call
  }
}
