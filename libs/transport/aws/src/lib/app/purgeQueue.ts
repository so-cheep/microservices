import { SQS } from 'aws-sdk'

export async function purgeQueue(props: {
  sqs: SQS
  queueUrl: string
}) {
  const { sqs, queueUrl } = props

  await sqs
    .purgeQueue({
      QueueUrl: queueUrl,
    })
    .promise()
}
