import { MicroserviceTransportUtils } from '@cheep/microservices'
import { CheepMicroservicesModule } from '@cheep/nestjs'
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
    CheepMicroservicesModule.forRoot({
      transport: new MemoryTransport<AppMetadata>(
        {
          metadataReducers: [
            callStackReducer(),
            transactionReducer(
              MicroserviceTransportUtils.newId,
              Date.now,
            ),
            createdAtReducer(Date.now),
          ],
          metadataValidator: [
            callStackValidator(['Command.']),
            transactionDurationValidator(9999, Date.parse, Date.now),
          ],
        },
        MicroserviceTransportUtils,
      ),
    }),
    ClientModule,
  ],
})
export class AppModule {}
