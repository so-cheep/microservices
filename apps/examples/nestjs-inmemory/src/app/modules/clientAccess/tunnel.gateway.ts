import { OnModuleInit } from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { Subject } from 'rxjs'
import { Server, Socket } from 'socket.io'
import { ExpressAdapter } from '@nestjs/platform-express'
import { CompleteMessage, createRouter } from '@cheep/router'
import { TransportBase } from '@cheep/transport'

/**
 * because of a conflicting version of Socket.io used in another demo, we're NOT using the nest socketio gateway,
 * instead we're just rolling our own simple one
 */
export class TunnelGateway implements OnModuleInit {
  public readonly routerAddress = 'ClientAccess'
  constructor(
    private adapterHost: HttpAdapterHost<ExpressAdapter>,
    private transport: TransportBase,
  ) {}

  private activeTunnels = new Map<string, Socket>()
  private inbound$ = new Subject<{
    tunnelId: { clientId: string }
    message: unknown
  }>()
  private socketServer: Server

  onModuleInit() {
    // create socket.io server
    this.socketServer = new Server(
      this.adapterHost.httpAdapter.getHttpServer(),
      {
        serveClient: false,
      },
    )
    this.socketServer.on('connection', (socket: Socket) =>
      this.handleConnection(socket),
    )

    // create a cheep router
    createRouter({
      routerAddress: this.routerAddress,
      transport: this.transport,
      nextHops: [
        {
          exampleTunnelId: { clientId: '' },
          registerReceiver: rcv =>
            this.inbound$.subscribe({
              next: x => rcv(x.tunnelId, x.message as any),
            }),
          send: (tunnelId, data) => this.send(tunnelId, data),
          type: 'TUNNEL',
        },
      ],
    })
  }

  private handleConnection(client: Socket) {
    // store the socket
    this.activeTunnels.set(client.id, client)
    // just collect all events and send them onward
    // stripping off the event name, which we don't use
    client.onAny((_, ...args) =>
      this.inbound$.next({
        tunnelId: { clientId: client.id },
        message: args,
      }),
    )
    client.on('disconnect', () =>
      this.activeTunnels.delete(client.id),
    )
  }

  /** send a data payload to the correct tunnel */
  private send(tunnelId: { clientId: string }, data: unknown) {
    this.activeTunnels.get(tunnelId.clientId).send(data)
  }
}
