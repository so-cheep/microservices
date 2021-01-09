import type { SQS } from 'aws-sdk'

export async function ensureQueueExists(props: {
  sqs: SQS
  queueName: string
  deadLetterQueueArn: string | null
  tagName: string
  isFifo: boolean
}) {
  const {
    sqs,
    queueName,
    deadLetterQueueArn,
    tagName,
    isFifo,
  } = props

  const fullQueueName = isFifo ? `${queueName}.fifo` : queueName

  const queues = await sqs
    .listQueues({
      QueueNamePrefix: fullQueueName,
      MaxResults: 1,
    })
    .promise()

  let queueUrl = queues?.QueueUrls && queues?.QueueUrls[0]
  if (!queueUrl) {
    const redrivePolicy = deadLetterQueueArn
      ? JSON.stringify({
          deadLetterTargetArn: deadLetterQueueArn,
          maxReceiveCount: 3,
        })
      : null

    const queue = await sqs
      .createQueue({
        QueueName: fullQueueName,
        tags: {
          module: tagName,
        },
        Attributes: {
          ...(redrivePolicy
            ? { RedrivePolicy: redrivePolicy }
            : null),

          ...(isFifo
            ? {
                FifoQueue: 'true',
                FifoThroughputLimit: 'perQueue', // 'perQueue' | 'perMessageGroupId'
                DeduplicationScope: 'messageGroup', // 'messageGroup' | 'queue'
              }
            : null),
        },
      })
      .promise()

    queueUrl = queue.QueueUrl
  }

  const result = await sqs
    .getQueueAttributes({
      QueueUrl: queueUrl,
      AttributeNames: ['QueueArn'],
    })
    .promise()

  return {
    queueUrl,
    queueArn: result.Attributes.QueueArn,
  }
}
