import { Observable } from 'rxjs'

export interface MessageBus<
  TMessage,
  TPublishMessage = TMessage,
  TMetadata = any
> {
  message$: Observable<TMessage>

  publish(
    message: TPublishMessage,
    metadata?: TMetadata,
  ): Promise<void>
}
