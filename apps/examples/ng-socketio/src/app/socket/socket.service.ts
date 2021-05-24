import { Injectable } from '@angular/core'
import { createRouter } from '@cheep/router'
import { io, Socket } from 'socket.io-client'
import { ClientRemoteApi } from '../../client.api'
import { ApiService } from '../api/api.service'

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket
  constructor(private readonly api: ApiService<ClientRemoteApi>) {
    // this is configured to connect to the example-nestjs-inmemory app
    this.socket = io('http://localhost:3000')

    createRouter({
      routerId: `CLIENT-${this.socket.id}`,
      transport: this.api.transport,
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
