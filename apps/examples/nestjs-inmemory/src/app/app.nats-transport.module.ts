import { MicroserviceTransportUtils } from '@cheep/microservices'
import { CheepMicroservicesModule } from '@cheep/nestjs'
import {
  callStackReducer,
  callStackValidator,
  createdAtReducer,
  transactionDurationValidator,
  transactionReducer,
} from '@cheep/transport'
import { NatsTransport } from '@cheep/nats'
import { Module } from '@nestjs/common'
import { GatewayModule } from './modules/gateway/gateway.module'
import { GroupModule } from './modules/groups/group.module'
import { UserModule } from './modules/user/user.module'
import { AppMetadata } from './types'

@Module({
  imports: [
    CheepMicroservicesModule.forRoot({
      transport: new NatsTransport<AppMetadata>(
        {
          moduleName: 'example',
          natsServerUrls: `nats://demo.nats.io`,
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
    UserModule,
    GroupModule,
    GatewayModule,
  ],
})
export class AppNatsTransportModule {}
