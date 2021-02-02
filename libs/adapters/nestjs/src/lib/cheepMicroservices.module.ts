import { Module, DynamicModule, Inject } from '@nestjs/common'

import type {
  CheepMicroservicesModuleConfig,
  CheepMicroservicesRootConfig,
  GenericMicroserviceApi,
  GenericNestApi,
} from './types'
import {
  ModuleNameToken,
  ModuleOptionsToken,
  RootOptionsToken,
  TransportToken,
} from './constants'
import { registerModuleName } from './util/moduleRegistry'
import { CheepApi } from './services/api.service'
import { CheepEvents } from './services/events.service'
import { CqrsHandlerRegistryService } from './services/cqrsHandlerRegistry.service'
import { CheepTransportModule } from './modules/core/cheepTransport.module'
import type { Transport } from '@cheep/transport'

@Module({})
export class CheepMicroservicesModule {
  static forRoot(
    options: CheepMicroservicesRootConfig,
  ): DynamicModule {
    return {
      module: CheepMicroservicesModule,
      providers: [
        {
          provide: RootOptionsToken,
          useValue: options,
        },
      ],
      imports: [CheepTransportModule.forRoot(options.transport)],
    }
  }

  static forModule<
    TModuleApi extends GenericNestApi,
    TRemoteApi extends GenericMicroserviceApi
  >(
    options: CheepMicroservicesModuleConfig<TModuleApi, TRemoteApi>,
  ): DynamicModule {
    registerModuleName(options.moduleName)

    return {
      module: CheepMicroservicesModule,
      providers: [
        CqrsHandlerRegistryService,
        CheepEvents,
        {
          provide: ModuleNameToken,
          useValue: options.moduleName,
        },
        {
          provide: ModuleOptionsToken,
          useValue: options,
        },
        CheepApi,
      ],
      exports: [CheepEvents, CheepApi],
    }
  }

  constructor(@Inject(TransportToken) private transport: Transport) {}
}
