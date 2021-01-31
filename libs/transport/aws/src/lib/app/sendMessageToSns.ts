import type { SNS } from 'aws-sdk'
import { encodeMetadataValue } from './encodeMetadataValue'

export async function sendMessageToSns<TMetadata>(props: {
  sns: SNS
  topicArn: string
  route: string
  message: string
  metadata: TMetadata
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
    metadata,
    correlationId,
    deduplicationId,
    messageGroupId,
    replyToQueueUrl,
  } = props

  const sendItem = {
    message,
    metadata,
  }

  await sns
    .publish({
      TopicArn: topicArn,
      Message: JSON.stringify(sendItem),
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
