import { NormalizedError } from './domain/normalizeError'
import { TransportUtils } from './transport.base'

export interface Transport {
  readonly state: TransportState

  /**
   * Make sure all entities are initialized
   */
  init(): Promise<void>

  on(route: string, action: RouteHandler): void

  off(route: string): void

  onEvery(prefixes: string[], action: FireAndForgetHandler): void

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

export interface TransportMessage<
  TMeta extends MessageMetadata = MessageMetadata
> {
  route: string
  message: string
  metadata: TMeta

  correlationId: string
  replyTo?: string

  errorData?: NormalizedError
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
  metadata?: Partial<TMetadata>
  referrer?: Referrer<TMetadata>
}

export interface ExecuteProps<TMetadata extends MessageMetadata> {
  route: string
  message: unknown
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
  currentMessage: unknown
}) => Partial<TMeta>

export type MetadataValidator<TMeta extends MessageMetadata> = (
  msg: TransportMessage<TMeta>,
) => void
