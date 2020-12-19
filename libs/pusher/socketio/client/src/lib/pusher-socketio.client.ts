import {
  PusherClient,
  PusherClientInputMessage,
} from '@nx-cqrs/pusher/shared/client'
import { Subject } from 'rxjs'
import { Manager, Socket } from 'socket.io-client'

export class PusherSocketIOClient<
  In extends PusherClientInputMessage,
  Out
> implements PusherClient<In, Out> {
  message$ = new Subject<In>()

  private manager: Manager
  private socket: Socket

  constructor(options: {
    appId: string
    url: string
    getQueryParams: () => Object
    handleError: (err: Error, msg: any) => void
  }) {
    const input$ = new Subject<In>()

    this.manager = new Manager(options.url, {
      autoConnect: false, // important to be 'true' for namespaces to work properly
      reconnection: true,
      reconnectionAttempts: 0,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      rejectUnauthorized: false,
      forceNew: false,
      query: options.getQueryParams(),
    })

    const socket = this.manager.socket(options.appId)

    socket.on('connect', (...args: any) => {
      input$.next(<any>(<PusherClientInputMessage>{
        type: 'Pusher.Client.Connected',
      }))
    })

    socket.on('reconnect', () => {
      input$.next(<any>(<PusherClientInputMessage>{
        type: 'Pusher.Client.Connected',
      }))
    })

    socket.on('connect_error', (err: Error) => {
      input$.next(<any>(<PusherClientInputMessage>{
        type: 'Pusher.Client.Error',
        reasonCode: 'CONNECT_ERROR',
        error: err,
      }))
    })

    // socket.on('reconnect_error', (err: Error) => {
    //   data$.next({
    //     type: 'ERROR',
    //     detail: { type: 'RECONNECT_ERROR', error: err },
    //   })
    // })

    socket.on('connect_timeout', () => {
      input$.next(<any>(<PusherClientInputMessage>{
        type: 'Pusher.Client.Error',
        reasonCode: 'CONNECT_TIMEOUT',
      }))
    })

    socket.on('message', (msg: any) => {
      if (!msg) {
        return
      }

      if (msg?.type && msg.type.startsWith('Pusher.Client.')) {
        return
      }

      input$.next(<any>(<PusherClientInputMessage>msg))
    })

    // update token on reconnect attempt
    socket.on('reconnect_attempt', () => {
      const manager: any = socket.io
      if (manager?.opts) {
        manager.opts.query = options.getQueryParams()
      }

      input$.next(<any>(<PusherClientInputMessage>{
        type: 'Pusher.Client.ReconnectAttempted',
      }))
    })

    socket.on('reconnecting', (attempt: number) => {
      input$.next(<any>(<PusherClientInputMessage>{
        type: 'Pusher.Client.Reconnecting',
        attempt,
      }))
    })

    socket.on('disconnect', () => {
      input$.next(<any>(<PusherClientInputMessage>{
        type: 'Pusher.Client.Disconnected',
      }))
    })

    this.socket = socket
  }

  async publish(message: Out) {
    this.socket.send(message)
  }

  async connect() {
    this.socket.connect()
  }

  async disconnect() {
    this.socket.disconnect()
  }
}
