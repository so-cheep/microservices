import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { GatewayApi, ConsumedApis } from './rest.api'

import { RestService } from './rest.controller'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<GatewayApi, ConsumedApis>({
      handlers: {},
      listenEvery: {},
    }),
  ],
  controllers: [RestService],
  providers: [],
})
export class RestModule {}
