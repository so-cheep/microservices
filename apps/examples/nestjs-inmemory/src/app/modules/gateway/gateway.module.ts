import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { GatewayService } from './gateway.controller'
import { ConsumedApis } from './types'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<never, ConsumedApis>({
      moduleName: 'Gateway',
      commandHandlers: [],
      queryHandlers: [],
      listenEventsFrom: ['User'],
    }),
  ],
  controllers: [GatewayService],
})
export class GatewayModule {}
