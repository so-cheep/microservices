import type { SNS } from 'aws-sdk'

export async function ensureTopicExists(props: {
  sns: SNS
  publishExchangeName: string
  tagName: string
}) {
  const { sns, publishExchangeName, tagName } = props

  const topicName = `${publishExchangeName}.fifo`

  const topics = await sns.listTopics({}).promise()
  const publishTopicArn = topics?.Topics?.filter(x =>
    x.TopicArn?.endsWith(topicName),
  ).map(x => x.TopicArn)[0]
  // topics.Topics[0].

  if (publishTopicArn) {
    return publishTopicArn
  }

  const topic = await sns
    .createTopic({
      Name: topicName,
      Attributes: {
        DisplayName: publishExchangeName,
        FifoTopic: 'true',
        // ContentBasedDeduplication: 'false'
        // Policy: '',
      },
      Tags: [
        {
          Key: 'module',
          Value: tagName,
        },
      ],
    })
    .promise()

  return topic.TopicArn
}
