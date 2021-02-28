import {
  CheepTransportModule,
  NestTransportUtils,
} from '@cheep/nestjs'
import {
  callStackReducer,
  callStackValidator,
  createdAtReducer,
  MemoryTransport,
  transactionDurationValidator,
  transactionReducer,
} from '@cheep/transport'
import { Module } from '@nestjs/common'
import { ClientModule } from './modules/client/client.module'
import { AppMetadata } from './types'

@Module({
  imports: [
    CheepTransportModule.forRoot({
      transport: new MemoryTransport<AppMetadata>(
        {
          metadataReducers: [
            callStackReducer(),
            transactionReducer(NestTransportUtils.newId, Date.now),
            createdAtReducer(Date.now),
          ],
          metadataValidator: [
            callStackValidator(['Command.']),
            transactionDurationValidator(9999, Date.parse, Date.now),
          ],
        },
        NestTransportUtils,
      ),
      joinSymbol: '.',
    }),
    ClientModule,
  ],
})
export class ClientAppModule {}
