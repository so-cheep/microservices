import type { SQS } from 'aws-sdk'
import { SqsTransportMessage } from '../types'

export function normalizeSqsMessage(
  sqsMessage: SQS.Message,
): SqsTransportMessage {
  const body = sqsMessage.Body
  const message = body

  const attributes = Object.fromEntries(
    Object.entries(
      sqsMessage.MessageAttributes,
    ).map(([key, { StringValue }]: any) => [key, StringValue]),
  )

  const { correlationId, metadata, errorData } = attributes

  return {
    route: '',
    message,
    metadata,

    correlationId,
    errorData,

    receiptHandle: sqsMessage.ReceiptHandle,
  }
}
