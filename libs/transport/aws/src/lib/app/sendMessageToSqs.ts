import type { SQS } from 'aws-sdk'

export async function sendMessageToSqs<TMetadata>(props: {
  sqs: SQS
  queueUrl: string
  message: string
  metadata: TMetadata
  correlationId: string
}) {
  const { sqs, queueUrl, message, metadata, correlationId } = props

  const messageAttributes = Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      {
        DataType: 'String',
        StringValue: value,
      },
    ]),
  )

  await sqs
    .sendMessage({
      QueueUrl: queueUrl,
      MessageBody: message,
      MessageAttributes: {
        ...messageAttributes,
        correlationId: {
          DataType: 'String',
          StringValue: correlationId,
        },
      },
    })
    .promise()
}
