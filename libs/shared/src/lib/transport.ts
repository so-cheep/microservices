import { Observable } from 'rxjs'

export interface Transport<TMetadata extends MessageMetadata> {
  /**
   * rabbitmq         - name for the queue & response queue (rpc)
   * socket.io-server - not used
   * socket.io-client - not used
   */
  moduleName?: string

  /**
   * received message stream
   */
  message$: Observable<TransportItem<any, TMetadata>>

  /**
   * rabbitmq         - publish new message to the queue
   * socket.io-server - send message to the client, based on the socketId in metadata
   * socket.io-client - send message to the server
   */
  publish<TResult>(props: PublishProps<any>): Promise<TResult>

  /**
   * rabbitmq         - create binding (exchange -> queue)
   * socket.io-server - do nothing
   * socket.io-client - adds event to listen (?)
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
  T extends Message<T>,
  TMetadata extends MessageMetadata
> {
  route: string
  message: T

  metadata: TMetadata

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
  sendReply(result: any, metadata: MessageMetadata): Promise<void>
}

export interface MessageMetadata {
  [key: string]: unknown
}

export type Message<T extends Message<T>> = {
  type: T['type']
}

export interface PublishProps<T> {
  route: string
  message: T

  metadata: MessageMetadata

  rpc?: {
    enabled: boolean
    timeout: number
  }
}
