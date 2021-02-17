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
import { ClientAccessModule } from './modules/clientAccess/clientAccess.module'
import { GroupModule } from './modules/groups/group.module'
import { RestModule } from './modules/rest/rest.module'
import { UserModule } from './modules/user/user.module'
import { AppMetadata } from './types'

@Module({
  imports: [
    CheepTransportModule.forRoot({
      transport: new MemoryTransport<AppMetadata>(
        {
          // defaultRpcTimeout: 99999,
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
      executablePrefixes: [
        'Command',
        'Query',
        'ClientAccess.Command',
        'ClientAccess.Query',
      ],
      joinSymbol: '.',
    }),
    UserModule,
    GroupModule,
    RestModule,
    ClientAccessModule,
  ],
})
export class AppModule {}
