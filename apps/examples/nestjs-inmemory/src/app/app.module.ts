import { MicroserviceTransportUtils } from '@cheep/microservices'
import { CheepMicroservicesModule } from '@cheep/nestjs'
import {
  callStackRule,
  callStackValidator,
  createdAtRule,
  MemoryTransport,
  transactionDurationValidator,
  transactionRule,
} from '@cheep/transport'
import { Module } from '@nestjs/common'
import { GatewayModule } from './modules/gateway/gateway.module'
import { GroupModule } from './modules/groups/group.module'
import { UserModule } from './modules/user/user.module'
import { AppMetadata } from './types'

@Module({
  imports: [
    CheepMicroservicesModule.forRoot({
      transport: new MemoryTransport<AppMetadata>(
        {
          metadataReducers: [
            callStackRule(),
            transactionRule(
              MicroserviceTransportUtils.newId,
              Date.now,
            ),
            createdAtRule(Date.now),
          ],
          metadataValidator: [
            callStackValidator(['Command.']),
            transactionDurationValidator(9999, Date.parse, Date.now),
          ],
        },
        MicroserviceTransportUtils,
      ),
    }),
    UserModule,
    GroupModule,
    GatewayModule,
  ],
})
export class AppModule {}
