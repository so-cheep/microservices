import { Observable } from 'rxjs'

export interface Transport<
  TMetadata extends MessageMetadata = never,
  TMessageType = unknown,
  TModuleName extends string = string
> {
  /**
   * rabbitmq         - name for the queue & response queue (rpc)
   * socket.io-server - not used
   * socket.io-client - not used
   *
   * _used by the rpc layer to determine namespace for handlers_
   */
  moduleName: TModuleName

  /**
   * received message stream
   */
  message$: Observable<TransportItem<TMetadata, TMessageType>>

  /**
   * - rabbitmq         - publish new message to the queue
   * - socket.io-server - send message to the client, based on the socketId in metadata
   * - socket.io-client - send message to the server
   */
  publish<TResult, TMeta extends TMetadata = TMetadata>(
    props: PublishProps<TMeta, TMessageType>,
  ): Promise<{ result: TResult; metadata: TMeta }>

  /**
   * - rabbitmq         - create binding (exchange -> queue)
   * - socket.io-server - do nothing
   * - socket.io-client - adds event to listen (?)
   */
  listenPatterns(patterns: string[]): void

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
  dispose(): void
}

export interface TransportItem<
  TMetadata extends MessageMetadata,
  TMessageType = unknown,
  TResult = unknown
> {
  route: string
  message: TMessageType

  metadata: TMetadata & { originModule: string }

  // used with correlationId when its RPC
  replyTo?: string
  correlationId?: string

  /**
   * completes the message processing logic
   * @param isSuccess
   *  true - remove item from the queue
   *  false - move item to the dead letter queue
   */
  complete(isSuccess?: boolean): void
  sendReply(result: TResult, metadata: TMetadata): Promise<void>
}

export interface MessageMetadata {
  [key: string]: unknown
}

export interface PublishProps<
  TMetadata extends MessageMetadata,
  TMessage
> {
  route: string
  message: TMessage

  metadata: TMetadata

  rpc?: {
    enabled: boolean
    timeout: number
  }
}
