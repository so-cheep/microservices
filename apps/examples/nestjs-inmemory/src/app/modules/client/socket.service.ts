import { createRouter } from '@cheep/router'
import { TransportBase } from '@cheep/transport'
import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common'
import { io, Socket } from 'socket.io-client'
import { inspect } from 'util'

@Injectable()
export class SocketService implements OnModuleInit {
  private socket: Socket
  constructor(private transport: TransportBase) {}

  onModuleInit() {
    // connect socket.io
    this.socket = io('http://localhost:3000')

    createRouter({
      routerAddress: 'Server',
      transport: this.transport,
      nextHops: [
        {
          exampleTunnelId: { clientId: '' },
          type: 'TUNNEL',
          registerReceiver: rcv => this.socket.onAny(rcv),
          send: (tunnelId, data) => this.socket.send(data),
        },
      ],
    })

    this.socket.onAny((...args) =>
      console.log('SOCKET GOT', inspect(args)),
    )
  }
}
