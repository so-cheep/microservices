import { Observable } from 'rxjs'

export interface Transport<
  TMetadata extends MessageMetadata = MessageMetadata
> {
  /**
   * rabbitmq         - name for the queue & response queue (rpc)
   * socket.io-server - not used
   * socket.io-client - not used
   */
  moduleName?: string

  /**
   * received message stream
   */
  message$: Observable<
    TransportItem<TMetadata & { originModule: string }>
  >

  /**
   * - rabbitmq         - publish new message to the queue
   * - socket.io-server - send message to the client, based on the socketId in metadata
   * - socket.io-client - send message to the server
   */
  publish<TMeta extends TMetadata = TMetadata>(
    props: PublishProps<TMeta>,
  ): Promise<{ result: string; metadata: TMeta }>

  /**
   * - rabbitmq         - create binding (exchange -> queue)
   * - socket.io-server - do nothing
   * - socket.io-client - adds event to listen (?)
   */
  // listenPatterns(patterns: string[]): Promise<void>

  /**
   * Make sure all entities are initialized
   */
  init(): Promise<void>

  /**
   * rabbitmq         - start connection
   * socket.io-server - start server listening process
   * socket.io-client - connect to the server
   */
  start(): void

  /**
   * rabbitmq         - stop connection
   * socket.io-server - stop listening connections
   * socket.io-client - disconnect from the server
   */
  stop(): void

  /**
   * rabbitmq         - stop and clear resources
   * socket.io-server - stop and clear resources
   * socket.io-client - stop and clear resources
   */
  dispose(): Promise<void>

  on(route: string, action: RouteHandler<TMetadata>)

  onEvery(action: FireAndForgetHandler<TMetadata>)
}

export interface TransportItem<TMetadata extends MessageMetadata> {
  route: string
  message: string
  isError?: boolean

  metadata: TMetadata

  correlationId?: string

  /**
   * completes the message processing logic
   * @param isSuccess
   *  true - remove item from the queue
   *  false - move item to the dead letter queue
   */
  complete(isSuccess?: boolean): void
  sendReply(result: string, metadata?: TMetadata): Promise<void>
  sendErrorReply(err: Error): Promise<void>
}

export interface TransportCompactItem<
  TMetadata extends MessageMetadata
> {
  route: string
  message: string
  metadata: TMetadata
}

export type MessageMetadata = Record<string, unknown>

export type RouteHandler<
  TMetadata extends MessageMetadata = MessageMetadata
> = (item: TransportItem<TMetadata>) => Promise<void>

export type FireAndForgetHandler<
  TMetadata extends MessageMetadata = MessageMetadata
> = (item: TransportCompactItem<TMetadata>) => void

export interface PublishProps<TMetadata extends MessageMetadata> {
  route: string
  message: string

  metadata: TMetadata

  rpc?: {
    enabled: boolean
    timeout: number
  }
}

export interface PublishResult<TMetadata> {
  result: string
  metadata: TMetadata
}
