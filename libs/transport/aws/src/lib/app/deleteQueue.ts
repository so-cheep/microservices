export async function deleteQueue(props: {
  sqs: AWS.SQS
  queueUrl: string
}) {
  const { sqs, queueUrl } = props

  await sqs
    .deleteQueue({
      QueueUrl: queueUrl,
    })
    .promise()
}
