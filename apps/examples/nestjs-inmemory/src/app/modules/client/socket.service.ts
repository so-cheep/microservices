import { CheepApi } from '@cheep/nestjs'
import { createRouter } from '@cheep/router'
import { TransportBase } from '@cheep/transport'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { hostname } from 'os'
import { io, Socket } from 'socket.io-client'
import { ClientApi } from './client.api'

@Injectable()
export class SocketService implements OnModuleInit {
  private socket: Socket
  constructor(
    private transport: TransportBase,
    private api: CheepApi<ClientApi>,
  ) {}

  onModuleInit() {
    // connect socket.io
    this.socket = io('http://localhost:3000')

    createRouter({
      routerId: `CLIENT-${hostname()}`,
      transport: this.transport,
      nextHops: [
        {
          exampleTunnelId: {},
          type: 'TUNNEL',
          registerReceiver: rcv =>
            this.socket.onAny((event, data) => rcv({ event }, data)),
          send: (_, data) => {
            this.socket.send(data)
          },
        },
      ],
    })
  }
}
