import { NormalizedError } from '@cheep/transport'
import type { SQS } from 'aws-sdk'

export async function sendMessageToSqs(props: {
  sqs: SQS
  queueUrl: string
  message: string
  correlationId: string
  errorData?: NormalizedError
}) {
  const { sqs, queueUrl, message, correlationId, errorData } = props

  await sqs
    .sendMessage({
      QueueUrl: queueUrl,
      MessageBody: message,
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
