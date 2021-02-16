import { createRouter } from '@cheep/router'
import { TransportBase } from '@cheep/transport'
import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { io, Socket } from 'socket.io-client'

@Injectable()
export class SocketService implements OnApplicationBootstrap {
  private socket: Socket
  constructor(private transport: TransportBase) {}

  onApplicationBootstrap() {
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
  }
}
