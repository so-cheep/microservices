import type { SNS } from 'aws-sdk'

export async function ensureTopicExists(props: {
  sns: SNS
  publishTopicName: string
  tagName: string
}) {
  const { sns, publishTopicName, tagName } = props

  const topicName = `${publishTopicName}.fifo`

  const topics = await sns.listTopics({}).promise()
  const publishTopicArn = topics?.Topics?.filter(x =>
    x.TopicArn?.endsWith(topicName),
  ).map(x => x.TopicArn)[0]

  if (publishTopicArn) {
    return publishTopicArn
  }

  console.log('CREATING TOPIC', topicName)

  const topic = await sns
    .createTopic({
      Name: topicName,
      Attributes: {
        DisplayName: publishTopicName,
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
