import type { SQS } from 'aws-sdk'
import { normalizeSnsMessage } from '../domain/normalizeSnsMessage'
import { SqsTransportMessage } from '../types'
import { sendMessagesToDLQ } from './sendMessagesToDLQ'

export async function processTriggeredLambdaMessages(
  deadLetterQueueUrl: string,
  sqsMessages: SQS.Message[],
  getSqs: () => SQS,
  action: (x: SqsTransportMessage) => Promise<void>,
) {
  const messages = sqsMessages.map(normalizeSnsMessage)

  const successMessages: SqsTransportMessage[] = []
  const errorMessages: [SqsTransportMessage, Error][] = []

  for (const message of messages) {
    try {
      await action(message)

      successMessages.push(message)
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
    const sqs = getSqs()

    await sendMessagesToDLQ({
      sqs,
      queueUrl: deadLetterQueueUrl,
      messages: errorMessages,
    })
  }
}
