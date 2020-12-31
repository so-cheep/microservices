import { CheepMicroservicesModule } from '@cheep/nestjs'
import { MemoryTransport } from '@cheep/transport'
import { Module } from '@nestjs/common'
import { GatewayModule } from './modules/gateway/gateway.module'
import { UserModule } from './modules/user/user.module'

@Module({
  imports: [
    CheepMicroservicesModule.forRoot({
      transport: new MemoryTransport({ moduleName: 'Root' }),
    }),
    UserModule,
    GatewayModule,
  ],
})
export class AppModule {}
