import type { SNS } from 'aws-sdk'
import { encodeMetadataValue } from './encodeMetadataValue'

export async function sendMessageToSns(props: {
  sns: SNS
  topicArn: string
  route: string
  message: string
  messageGroupId: string
  deduplicationId: string
  correlationId?: string
  replyToQueueUrl?: string
}) {
  const {
    sns,
    topicArn,
    route,
    message,
    correlationId,
    deduplicationId,
    messageGroupId,
    replyToQueueUrl,
  } = props

  await sns
    .publish({
      TopicArn: topicArn,
      Message: message,
      MessageDeduplicationId: deduplicationId,
      MessageGroupId: messageGroupId,
      MessageAttributes: {
        route: {
          DataType: 'String',
          StringValue: encodeMetadataValue(route),
        },
        ...(correlationId
          ? {
              correlationId: {
                DataType: 'String',
                StringValue: correlationId,
              },
            }
          : null),
        ...(replyToQueueUrl
          ? {
              replyTo: {
                DataType: 'String',
                StringValue: encodeMetadataValue(replyToQueueUrl),
              },
            }
          : null),
      },
    })
    .promise()
}
