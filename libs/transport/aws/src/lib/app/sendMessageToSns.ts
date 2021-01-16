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

  const data = {
    TopicArn: topicArn,
    Message: message,
    MessageDeduplicationId: deduplicationId,
    MessageGroupId: messageGroupId,
    MessageAttributes: {
      route: {
        DataType: 'String',
        StringValue: encodeMetadataValue(route),
      },
      metadata: {
        DataType: 'String',
        StringValue: encodeMetadataValue(JSON.stringify(metadata)),
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
  }

  await sns.publish(data).promise()
}
