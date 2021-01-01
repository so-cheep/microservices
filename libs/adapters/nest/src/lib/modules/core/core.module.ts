import { DynamicModule, Global, Module } from '@nestjs/common'
import type { Transport } from '@cheep/transport/shared'
import { TransportToken } from '../../constants'

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
