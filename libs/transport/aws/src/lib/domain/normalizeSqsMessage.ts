import type { SQS } from 'aws-sdk'
import { SqsTransportMessage } from '../types'

export function normalizeSqsMessage(
  sqsMessage: SQS.Message,
): SqsTransportMessage {
  const body = sqsMessage.Body
  const message = body

  const fullMetadata = Object.fromEntries(
    Object.entries(
      sqsMessage.MessageAttributes,
    ).map(([key, { StringValue }]: any) => [key, StringValue]),
  )

  const {
    route,
    correlationId,
    replyToQueue,
    ...metadata
  } = fullMetadata

  return {
    route,
    message,
    metadata,

    correlationId,
    replyTo: replyToQueue,

    receiptHandle: sqsMessage.ReceiptHandle,
  }
}
