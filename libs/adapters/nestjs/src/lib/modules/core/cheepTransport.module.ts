import {
  DynamicModule,
  Global,
  Inject,
  Module,
  OnModuleInit,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common'
import { Transport, TransportBase } from '@cheep/transport'
import { TransportToken } from '../../constants'
import { onHandlerRegistrationComplete } from '../../util/moduleRegistry'
const logger = new Logger('CheepTransport')
/**
 * the core module is used for storing globally available config, which is just the transport for now
 */
@Global()
@Module({})
export class CheepTransportModule
  implements OnModuleInit, OnApplicationShutdown {
  static forRoot(transport: Transport): DynamicModule {
    // init the transport now
    transport
      .init()
      .then(() =>
        logger.log(`${transport.constructor.name} Initialized!`),
      )

    return {
      module: CheepTransportModule,
      providers: [
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
      exports: [TransportToken],
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
