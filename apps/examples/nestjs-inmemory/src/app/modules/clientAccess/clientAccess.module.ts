import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import {
  ClientAccessApi,
  ClientAccessRemoteApi,
} from './clientAccess.api'
import { TunnelGateway } from './tunnel.gateway'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<
      ClientAccessApi,
      ClientAccessRemoteApi
    >({
      handlers: {},
      listenEvery: {},
    }),
  ],
  providers: [TunnelGateway],
})
export class ClientAccessModule {}
