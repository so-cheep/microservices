import { CheepApi } from '@cheep/nestjs'
import { createRouter } from '@cheep/router'
import { TransportBase } from '@cheep/transport'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { io, Socket } from 'socket.io-client'
import { inspect } from 'util'
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
      routerAddress: 'Server',
      transport: this.transport,
      nextHops: [
        {
          exampleTunnelId: {},
          type: 'TUNNEL',
          registerReceiver: rcv =>
            this.socket.onAny((event, data) => rcv({ event }, data)),
          send: (_, data) => {
            console.log('SOCKET SENDING', data)
            this.socket.send(data)
          },
        },
      ],
    })

    this.socket.onAny((...args) =>
      console.log('SOCKET GOT', inspect(args)),
    )

    this.socket.on('connected', () =>
      this.api.do.Event.Socket.connected(),
    )
  }
}
