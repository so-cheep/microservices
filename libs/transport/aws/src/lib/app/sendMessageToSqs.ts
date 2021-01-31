import { NormalizedError } from '@cheep/transport'
import type { SQS } from 'aws-sdk'

export async function sendMessageToSqs<TMetadata>(props: {
  sqs: SQS
  queueUrl: string
  message: string
  metadata: TMetadata
  correlationId: string
  errorData?: NormalizedError
}) {
  const {
    sqs,
    queueUrl,
    message,
    metadata,
    correlationId,
    errorData,
  } = props

  await sqs
    .sendMessage({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({
        message,
        metadata,
      }),
      MessageAttributes: {
        correlationId: {
          DataType: 'String',
          StringValue: correlationId,
        },

        ...(errorData
          ? {
              errorData: {
                DataType: 'String',
                StringValue: JSON.stringify(errorData),
              },
            }
          : null),
      },
    })
    .promise()
}
