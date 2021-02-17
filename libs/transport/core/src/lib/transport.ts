export interface Transport {
  readonly state: TransportState

  /**
   * Make sure all entities are initialized
   */
  init(): Promise<void>

  on(route: string, action: RouteHandler): void

  off(route: string): void

  /** provide a fire-and-forget handler for an array of prefixes*/
  onEvery(
    prefixes: string[],
    action: FireAndForgetHandler,
    isRawHandler?: false,
  ): void
  /** provide raw handler for a specific prefix */
  onEvery(
    prefix: string,
    action: RawHandler,
    isRawHandler: true,
  ): void
  onEvery(
    prefixes: string[] | string,
    action: RawHandler | FireAndForgetHandler,
    isRawHandler?: boolean,
  ): void

  /**
   * At this point all handlers are registered and we can
   * configure Exchange->Queue bindings
   */
  start(): Promise<void>

  /**
   * Publish event, no result will be returned
   */
  publish(props: PublishProps<MessageMetadata>): Promise<void>

  /**
   * Execute RPC call, result will be returned always
   *
   * throws RPCTimeout error
   */
  execute(props: ExecuteProps<MessageMetadata>): Promise<unknown>

  /**
   * Stop connection to the queues
   */
  stop(): Promise<void>

  /**
   * Make sure all resources are disposed
   * Temp queues should be deleted
   */
  dispose(): Promise<void>
}

export interface TransportMessage {
  route: string
  message: string
  correlationId: string
  replyTo?: string
}

export interface TransportCompactMessage<TPayload = unknown> {
  route: string
  payload: TPayload
  metadata: MessageMetadata
}

export type ListenResponseCallback = (item: TransportMessage) => void

export type MessageMetadata = Record<string, unknown>

export type RawHandler = (
  item: TransportCompactMessage,
  raw: TransportMessage,
) => Promise<unknown | void>

export type RouteHandler = (
  item: TransportCompactMessage,
) => Promise<unknown | void>

export type FireAndForgetHandler = (
  item: TransportCompactMessage,
) => void

export interface PublishProps<TMetadata extends MessageMetadata> {
  route: string
  payload: unknown
  metadata?: Partial<TMetadata>
  referrer?: Referrer<TMetadata>
}

export interface ExecuteProps<TMetadata extends MessageMetadata> {
  route: string
  payload: unknown
  metadata?: TMetadata
  referrer?: Referrer<TMetadata>
  rpcTimeout?: number
}

export enum TransportState {
  STARTED = 'STARTED',
  STOPPED = 'STOPPED',
}

export interface Referrer<
  TMeta extends MessageMetadata = MessageMetadata
> {
  route?: string
  metadata?: TMeta
}

export type MetadataReducer<
  TMeta extends MessageMetadata = MessageMetadata
> = (context: {
  referrer: Referrer<TMeta>
  currentMetadata: Partial<TMeta>
  currentRoute: string
  currentPayload: unknown
}) => Partial<TMeta>

export type MetadataValidator<
  TMeta extends MessageMetadata = MessageMetadata
> = (msg: ValidatorMessage<TMeta>) => void

export interface ValidatorMessage<
  TMeta extends MessageMetadata = MessageMetadata
> {
  route: string
  payload: unknown
  metadata: TMeta
}
