import { TransportMessage } from './transport'
import {
  ListenMessagesProps,
  SendMessageProps,
  SendReplyMessageProps,
  TransportBase,
  TransportOptions,
  TransportUtils,
} from './transport.base'

export class MemoryTransport extends TransportBase {
  private listenMessagesCb: (items: TransportMessage[]) => number
  private listenResponseMessagesCb: (
    items: TransportMessage[],
  ) => number

  constructor(
    protected options: TransportOptions & {
      messageDelayTime?: number
    },
    protected utils: TransportUtils,
  ) {
    super(options, utils)
  }

  async init() {}

  protected async sendMessage(props: SendMessageProps) {
    const { messageDelayTime = 0 } = this.options

    const { route, message, metadata, correlationId, isRpc } = props

    /**
     * Need to skip one cycle to subscribe to the response messages first
     * Must use setTimeout or setImediate
     */
    if (!messageDelayTime) {
      setImmediate(() =>
        this.listenMessagesCb([
          {
            route,
            message,
            metadata,
            correlationId,
            replyTo: isRpc ? 'REPLY' : undefined,
          },
        ]),
      )

      return
    }

    setTimeout(() => {
      this.listenMessagesCb([
        {
          route,
          message,
          metadata,
          correlationId,
          replyTo: isRpc ? 'REPLY' : undefined,
        },
      ])
    }, messageDelayTime)
  }

  protected async sendReplyMessage(props: SendReplyMessageProps) {
    const { messageDelayTime = 0 } = this.options

    const { replyTo, message, correlationId, metadata } = props

    if (!messageDelayTime) {
      this.listenResponseMessagesCb([
        {
          route: replyTo,
          message,
          metadata,
          correlationId,
          replyTo: undefined,
        },
      ])
      return
    }

    setTimeout(() => {
      this.listenResponseMessagesCb([
        {
          route: replyTo,
          message,
          metadata,
          correlationId,
          replyTo: undefined,
        },
      ])
    }, messageDelayTime)
  }

  protected listenMessages({ cb }: ListenMessagesProps) {
    this.listenMessagesCb = cb
  }

  protected listenResponseMessages({ cb }: ListenMessagesProps) {
    this.listenResponseMessagesCb = cb
  }
}

// export class MemoryTransport2<
//   TMetadata extends MessageMetadata = MessageMetadata
// > implements Transport<TMetadata> {
//   moduleName?: string

//   message$: Observable<
//     TransportItem<TMetadata & { originModule: string }>
//   >

//   private routeHandlers = new Map<string, RouteHandler>()
//   private onEveryMessageAction: FireAndForgetHandler<TMetadata>

//   private internal$ = new Subject<
//     TransportItem<TMetadata & { originModule: string }>
//   >()

//   constructor(args: { moduleName: string }) {
//     this.moduleName = args.moduleName

//     this.message$ = this.internal$.asObservable()
//   }

//   async init() {}

//   publish<TMeta extends TMetadata = never>(
//     props: PublishProps<TMeta>,
//   ): Promise<PublishResult<TMeta>> {
//     const { message, metadata, route, rpc } = props

//     return new Promise<PublishResult<TMeta>>((resolve, reject) => {
//       const timeout = rpc?.enabled
//         ? setTimeout(() => {
//             reject(new RpcTimeoutError(<any>props))
//           }, rpc.timeout)
//         : undefined

//       const item: TransportItem<TMeta> = {
//         route,
//         message,
//         metadata,

//         // currently ignoring completion, because it's in memory!
//         complete: () => {
//           if (timeout) {
//             clearTimeout(timeout)
//           }
//         },

//         sendReply: async (result: any, resultMetadata) =>
//           resolve({
//             result,
//             metadata: {
//               ...metadata,
//               ...resultMetadata,
//             },
//           }),

//         sendErrorReply: async err => {
//           reject(err)
//         },
//       }

//       const handler = this.routeHandlers.get(item.route)
//       if (handler) {
//         handler(item)
//       }

//       if (this.onEveryMessageAction) {
//         this.onEveryMessageAction({
//           route: item.route,
//           message: item.message,
//           metadata: item.metadata,
//         })
//       }

//       this.internal$.next(<any>item)
//     })
//   }

//   on(route: string, action: RouteHandler<TMetadata>) {
//     this.routeHandlers.set(route, action)
//   }

//   onEvery(action: FireAndForgetHandler<TMetadata>) {
//     this.onEveryMessageAction = action
//   }

//   start(): void {
//     return
//   }

//   stop(): void {
//     return
//   }

//   async dispose() {
//     this.internal$.complete()
//   }
// }
