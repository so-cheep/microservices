import type { SQS } from 'aws-sdk'

export async function batchDeleteMessages(props: {
  sqs: SQS
  queueUrl: string
  receiptHandles: string[]
}) {
  const { sqs, queueUrl, receiptHandles } = props

  await sqs
    .deleteMessageBatch({
      QueueUrl: queueUrl,
      Entries: receiptHandles.map((x, i) => ({
        Id: i.toString(),
        ReceiptHandle: x,
      })),
    })
    .promise()
}
