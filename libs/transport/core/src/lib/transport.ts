import { NormalizedError } from './domain/normalizeError'

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

  /**
   * utility function to run the configured metadata merge
   * @param context
   */
  mergeMetadata(context: {
    referrerMetadata?: MessageMetadata | undefined
    currentMetadata: Partial<MessageMetadata>
    route: string
    message: unknown
  }): MessageMetadata
}

export interface TransportMessage {
  route: string
  message: string
  metadata: MessageMetadata

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
  metadata?: TMetadata
}

export interface ExecuteProps<TMetadata extends MessageMetadata> {
  route: string
  message: unknown
  metadata?: TMetadata

  rpcTimeout?: number
}

export enum TransportState {
  STARTED = 'STARTED',
  STOPPED = 'STOPPED',
}

export const MetdataToken = Symbol('Cheep Metadata Indicator')
