export interface Transport {
  /**
   * - rabbitmq         - publish new message to the queue
   * - socket.io-server - send message to the client, based on the socketId in metadata
   * - socket.io-client - send message to the server
   */
  publish(props: PublishProps<MessageMetadata>): Promise<void>

  execute(props: ExecuteProps<MessageMetadata>): Promise<unknown>

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
  start(): Promise<void>

  /**
   * rabbitmq         - stop connection
   * socket.io-server - stop listening connections
   * socket.io-client - disconnect from the server
   */
  stop(): Promise<void>

  /**
   * rabbitmq         - stop and clear resources
   * socket.io-server - stop and clear resources
   * socket.io-client - stop and clear resources
   */
  dispose(): Promise<void>

  on(route: string, action: RouteHandler): void

  off(route: string): void

  onEvery(prefixes: string[], action: FireAndForgetHandler)
}

export interface TransportMessage {
  route: string
  message: string
  metadata: MessageMetadata

  correlationId: string
  replyTo: string
}

export interface TransportCompactMessage {
  route: string
  message: unknown
  metadata: MessageMetadata
}

export type ListenResponseCallback = (item: TransportMessage) => void

export type MessageMetadata = Record<string, unknown>

export type RouteHandler = (
  item: TransportCompactMessage,
) => Promise<unknown | void>

export type FireAndForgetHandler = (
  item: TransportCompactMessage,
) => void

export interface PublishProps<TMetadata extends MessageMetadata> {
  route: string
  message: unknown
  metadata?: TMetadata
}

export interface ExecuteProps<TMetadata extends MessageMetadata> {
  route: string
  message: unknown
  metadata?: TMetadata

  rpcTimeout?: number
}
