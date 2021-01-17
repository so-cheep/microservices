import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { GatewayApi, ConsumedApis } from './gateway.api'
import { GatewayService } from './gateway.controller'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<GatewayApi, ConsumedApis>({
      moduleName: 'Gateway',
      listenEventsFrom: ['User'],
      commandHandlers: undefined,
      queryHandlers: null,
    }),
  ],
  controllers: [GatewayService],
})
export class GatewayModule {}
