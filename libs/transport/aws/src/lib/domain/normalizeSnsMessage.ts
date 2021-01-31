import type { SQS } from 'aws-sdk'
import { decodeMetadataValue } from '../app/decodeMetadataValue'
import { SqsTransportMessage } from '../types'

export function normalizeSnsMessage(
  sqsMessage: SQS.Message,
): SqsTransportMessage {
  const body = JSON.parse(sqsMessage.Body)
  const data = JSON.parse(body.Message)

  const { message, metadata } = data

  const attributes = Object.fromEntries(
    Object.entries(
      body.MessageAttributes,
    ).map(([key, { Value }]: any) => [key, Value]),
  )

  const { route, correlationId, replyTo } = attributes

  return {
    route: decodeMetadataValue(route),
    message,
    metadata,

    correlationId,
    replyTo: decodeMetadataValue(replyTo),

    receiptHandle: sqsMessage.ReceiptHandle,
  }
}
