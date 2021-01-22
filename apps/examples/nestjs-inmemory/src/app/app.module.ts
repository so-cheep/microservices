import { MicroserviceTransportUtils } from '@cheep/microservices'
import { CheepMicroservicesModule } from '@cheep/nestjs'
import { MemoryTransport, TransportOptions } from '@cheep/transport'
import { Module } from '@nestjs/common'
import { GatewayModule } from './modules/gateway/gateway.module'
import { GroupModule } from './modules/groups/group.module'
import { UserModule } from './modules/user/user.module'
import { AppMetadata } from './types'

@Module({
  imports: [
    CheepMicroservicesModule.forRoot({
      transport: new MemoryTransport(
        <TransportOptions<AppMetadata>>{
          metadataMerge: [
            ({ referrerMetadata, route }) => ({
              transactionId:
                referrerMetadata?.transactionId ??
                MicroserviceTransportUtils.newId(),
              transactionStack: (
                referrerMetadata?.transactionStack ?? []
              ).concat([route]),
              transactionStart:
                referrerMetadata?.transactionStart ?? new Date(),
            }),
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
