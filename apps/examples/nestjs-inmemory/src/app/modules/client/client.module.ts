import { CheepMicroservicesModule } from '@cheep/nestjs'
import { TransportBase } from '@cheep/transport'
import { Module, OnModuleInit } from '@nestjs/common'
import { inspect } from 'util'
import { ClientApi, ClientRemoteApi } from './client.api'
import { SocketService } from './socket.service'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<ClientApi, ClientRemoteApi>({
      handlers: {},
      listenEvery: {},
    }),
  ],
  providers: [SocketService],
})
export class ClientModule implements OnModuleInit {
  constructor(private transport: TransportBase) {}
  onModuleInit() {
    this.transport.onEvery(['Event'], item =>
      console.log('GOT ITEM', inspect(item)),
    )
  }
}
