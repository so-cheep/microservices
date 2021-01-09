import type { SQS } from 'aws-sdk'
import { SqsTransportMessage } from '../types'
import { batchDeleteMessages } from './batchDeleteMessages'
import { sendMessagesToDLQ } from './sendMessagesToDLQ'

export async function processSqsMessages(
  queueUrl: string,
  deadLetterQueueUrl: string,
  messages: SqsTransportMessage[],
  getSqs: () => SQS,
  action: (x: SqsTransportMessage) => Promise<void>,
) {
  const errorMessages: [SqsTransportMessage, Error][] = []

  for (const message of messages) {
    try {
      await action(message)
    } catch (err) {
      console.error('LAMBDA_TRANSPORT_PROCESSING_ERROR', err)
      errorMessages.push([message, err])
    }
  }

  /**
   * Don't ack any messages if all of them passed successfully
   * Lambda will ack them for us
   */
  if (errorMessages.length) {
    // move error messages to the DLQ and let this process finish successfully
    await sendMessagesToDLQ({
      sqs: getSqs(),
      queueUrl: deadLetterQueueUrl,
      messages: errorMessages,
    })
  }

  // Delete all messages after processing
  if (sqsMessages.length) {
    await batchDeleteMessages({
      sqs: getSqs(),
      queueUrl,
      receiptHandles: sqsMessages.map(x => x.ReceiptHandle),
    })
  }
}
