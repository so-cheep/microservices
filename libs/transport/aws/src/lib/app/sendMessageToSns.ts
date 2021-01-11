import type { SNS } from 'aws-sdk'

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

  await sns
    .publish({
      TopicArn: topicArn,
      Message: message,
      MessageDeduplicationId: deduplicationId,
      MessageGroupId: messageGroupId,
      MessageAttributes: {
        route: {
          DataType: 'String',
          StringValue: route,
        },
        metadata: {
          DataType: 'String',
          StringValue: JSON.stringify(metadata),
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
                StringValue: replyToQueueUrl,
              },
            }
          : null),
      },
    })
    .promise()
}
