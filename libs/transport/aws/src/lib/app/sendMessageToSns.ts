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

  const messageAttributes = Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      {
        DataType: 'String',
        StringValue: value,
      },
    ]),
  )

  await sns
    .publish({
      TopicArn: topicArn,
      Message: message,
      MessageDeduplicationId: deduplicationId,
      MessageGroupId: messageGroupId,
      MessageAttributes: {
        ...messageAttributes,
        route: {
          DataType: 'String',
          StringValue: route,
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
              replyToQueue: {
                DataType: 'String',
                StringValue: replyToQueueUrl,
              },
            }
          : null),
      },
    })
    .promise()
}
