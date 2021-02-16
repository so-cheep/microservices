import { MicroserviceTransportUtils } from '@cheep/microservices'
import { CheepTransportModule } from '@cheep/nestjs'
import {
  callStackReducer,
  callStackValidator,
  createdAtReducer,
  MemoryTransport,
  transactionDurationValidator,
  transactionReducer,
} from '@cheep/transport'
import { Module } from '@nestjs/common'
import { GroupModule } from './modules/groups/group.module'
import { RestModule } from './modules/rest/rest.module'
import { UserModule } from './modules/user/user.module'
import { AppMetadata } from './types'

@Module({
  imports: [
    CheepTransportModule.forRoot({
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
      executablePrefixes: ['Command', 'Query'],
      joinSymbol: '.',
    }),
    UserModule,
    GroupModule,
    RestModule,
  ],
})
export class AppModule {}
