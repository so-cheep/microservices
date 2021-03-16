import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { RestGroupEventHandler } from './group.eventHandler'
import { GatewayApi, ConsumedApis } from './rest.api'

import { RestService } from './rest.controller'
import { RestUserEventHandler } from './user.eventHandler'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<GatewayApi, ConsumedApis>({
      handlers: {
        Event: {
          Group: RestGroupEventHandler,
          User: RestUserEventHandler,
        },
      },
      listenEvery: {},
    }),
  ],
  controllers: [RestService],
  providers: [RestGroupEventHandler, RestUserEventHandler],
})
export class RestModule {}
