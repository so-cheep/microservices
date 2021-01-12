import { MicroserviceTransportUtils } from '@cheep/microservices'
import { CheepMicroservicesModule } from '@cheep/nestjs'
import { MemoryTransport } from '@cheep/transport'
import { Module } from '@nestjs/common'
import { GatewayModule } from './modules/gateway/gateway.module'
import { GroupModule } from './modules/groups/group.module'
import { UserModule } from './modules/user/user.module'

@Module({
  imports: [
    CheepMicroservicesModule.forRoot({
      transport: new MemoryTransport({}, MicroserviceTransportUtils),
    }),
    UserModule,
    GroupModule,
    GatewayModule,
  ],
})
export class AppModule {}
