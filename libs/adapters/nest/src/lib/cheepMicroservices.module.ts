import { Module, DynamicModule } from '@nestjs/common'

import type { Transport } from '@cheep/transport/shared'

import type {
  CheepMicroservicesModuleConfig,
  CheepMicroservicesRootConfig,
  CheepNestApi,
} from './types'
import {
  ModuleNameToken,
  ModuleOptionsToken,
  TransportToken,
} from './constants'
import { registerModuleName } from './util/moduleRegistry'
import { CqrsClientService } from './services/cqrsClient.service'
import {
  CommandMap,
  EventMap,
  getCqrsClient,
  handleEvents,
  MicroserviceApi,
  QueryMap,
  RpcMetadata,
} from '@cheep/microservices'
import { MissingTransportError } from './errors/missingTransport.error'
import { EventHandlerService } from './services/eventHandler.service'
import { EventPublisherService } from './services/eventPublisher.service'

@Module({
  providers: [
    {
      provide: TransportToken,
      useFactory: () => {
        throw new MissingTransportError()
      },
    },
    {
      provide: CqrsClientService,
      useFactory: (transport: Transport<RpcMetadata>) => {
        getCqrsClient(transport)
      },
      inject: [TransportToken],
    },
    {
      provide: EventHandlerService,
      useFactory: (
        transport: Transport<RpcMetadata>,
        options: CheepMicroservicesModuleConfig<never, never>,
      ) => {
        handleEvents(transport, options.listenEventsFrom)
      },
      inject: [TransportToken, ModuleOptionsToken],
    },
    EventPublisherService,
  ],
  exports: [
    CqrsClientService,
    EventHandlerService,
    EventPublisherService,
  ],
})
export class CheepMicroservicesModule {
  static forRoot(
    options: CheepMicroservicesRootConfig,
  ): DynamicModule {
    return {
      module: CheepMicroservicesModule,
      providers: [
        {
          provide: TransportToken,
          useValue: options.transport,
        },
      ],
    }
  }

  static forModule<
    TModuleApi extends CheepNestApi<
      string,
      unknown[],
      unknown[],
      EventMap
    >,
    TRemoteApi extends MicroserviceApi<
      string,
      QueryMap,
      CommandMap,
      EventMap
    >
  >(
    options: CheepMicroservicesModuleConfig<TModuleApi, TRemoteApi>,
  ): DynamicModule {
    registerModuleName(options.moduleName)

    return {
      module: CheepMicroservicesModule,
      providers: [
        {
          provide: ModuleNameToken,
          useValue: options.moduleName,
        },
        {
          provide: ModuleOptionsToken,
          useValue: options,
        },
      ],
    }
  }
}
