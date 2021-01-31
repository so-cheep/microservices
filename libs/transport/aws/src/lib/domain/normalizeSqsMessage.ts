import type { SQS } from 'aws-sdk'
import { SqsTransportMessage } from '../types'

export function normalizeSqsMessage(
  sqsMessage: SQS.Message,
): SqsTransportMessage {
  const body = sqsMessage.Body

  const attributes = Object.fromEntries(
    Object.entries(
      sqsMessage.MessageAttributes,
    ).map(([key, { StringValue }]: any) => [key, StringValue]),
  )

  const { correlationId } = attributes

  return {
    route: '',
    message: body,

    correlationId,

    receiptHandle: sqsMessage.ReceiptHandle,
  }
}
