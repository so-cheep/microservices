import { TransportMessage } from '@cheep/transport'
import type { SQS } from 'aws-sdk'

export async function sendMessagesToDLQ(props: {
  sqs: SQS
  queueUrl: string
  messages: [TransportMessage, Error][]
}) {
  const { sqs, queueUrl, messages } = props

  await sqs
    .sendMessageBatch({
      QueueUrl: queueUrl,
      Entries: messages.map((x, i) => ({
        Id: i.toString(),
        MessageBody: x[0].message,
        // TODO: store x[1] Error as well somewhere in attributes
        // TODO: store metadata in attributes
        // MessageAttributes: x.Attributes
      })),
    })
    .promise()
}
