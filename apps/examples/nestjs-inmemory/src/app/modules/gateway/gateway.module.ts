import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { UserApi } from '../user/types'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<never, UserApi>({
      moduleName: 'Gateway',
      commandHandlers: [],
      queryHandlers: [],
      listenEventsFrom: ['User'],
    }),
  ],
})
export class GatewayModule {}
