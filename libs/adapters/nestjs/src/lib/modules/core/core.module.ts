import { DynamicModule, Global, Module } from '@nestjs/common'
import type { Transport } from '@cheep/transport'
import { TransportToken } from '../../constants'

/**
 * the core module is used for storing globally available config, which is just the transport for now
 */
@Global()
@Module({})
export class CheepCoreModule {
  static forRoot(transport: Transport): DynamicModule {
    return {
      module: CheepCoreModule,
      providers: [
        {
          provide: TransportToken,
          useValue: transport,
        },
      ],
      exports: [TransportToken],
    }
  }
}
