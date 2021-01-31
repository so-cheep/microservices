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
        ...(tagName
          ? {
              tags: {
                module: tagName,
              },
            }
          : null),
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

          Policy: JSON.stringify({
            Version: '2012-10-17',
            Id: 'Policy1612036158843',
            Statement: [
              {
                Sid: 'Stmt1612036157144',
                Effect: 'Allow',
                Principal: '*',
                Action: 'sqs:*',
                Resource: 'arn:aws:sqs:*:*:*',
              },
            ],
          }),
        },
      })
      .promise()

    console.log('aws.transport', 'queue created', fullQueueName)

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
