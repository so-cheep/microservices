import { Transport, TransportBase } from '@cheep/transport'
import {
  DynamicModule,
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common'
import {
  defaultRootConfig,
  RootConfigToken,
  TransportToken,
} from './constants'
import { CheepMicroservicesRootConfig } from './types'
import { onHandlerRegistrationComplete } from './util/handlerRegistration'

const logger = new Logger('CheepTransport')
/**
 * the core module is used for storing globally available config, which is just the transport for now
 */
@Global()
@Module({
  providers: [
    {
      provide: RootConfigToken,
      useValue: defaultRootConfig,
    },
  ],
})
export class CheepTransportModule
  implements OnModuleInit, OnApplicationShutdown {
  static forRoot(
    options: CheepMicroservicesRootConfig,
  ): DynamicModule {
    const { transport } = options

    transport
      .init()
      .then(() =>
        logger.log(
          `${transport.constructor.name} Initialized!`,
          'Init',
        ),
      )
      .catch(err =>
        logger.error(
          `${transport.constructor.name} encountered an error: ${err}`,
          err,
          'Init',
        ),
      )

    return {
      module: CheepTransportModule,
      providers: [
        {
          provide: RootConfigToken,
          useValue: {
            ...defaultRootConfig,
            ...options,
          },
        },
        {
          provide: TransportToken,
          useValue: transport,
        },
        {
          provide: TransportBase,
          useExisting: TransportToken,
        },
        // {
        //   provide: Object.getPrototypeOf(transport),
        //   useExisting: transport,
        // },
      ],
      exports: [TransportToken, TransportBase, RootConfigToken],
      global: true,
    }
  }

  constructor(@Inject(TransportToken) private transport: Transport) {}

  async onModuleInit() {
    // setup listener for when handers are complete
    onHandlerRegistrationComplete(() =>
      this.transport
        .start()
        .then(() =>
          logger.log(`${this.transport.constructor.name} Started!`),
        ),
    )
  }

  async onApplicationShutdown() {
    // clean up transport on shutdown
    await this.transport.dispose()
  }
}
