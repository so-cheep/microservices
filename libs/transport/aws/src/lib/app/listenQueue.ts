import type { SQS } from 'aws-sdk'
import { normalizeSnsMessage } from '../domain/normalizeSnsMessage'
import { normalizeSqsMessage } from '../domain/normalizeSqsMessage'
import { SqsTransportMessage } from '../types'

export async function listenQueue(props: {
  sqs: SQS
  queueUrl: string
  requestAttemptId: string
  waitTimeInSeconds: number
  maxNumberOfMessages: number
  isSnsMessage: boolean
  newId: () => string
  shouldContinue: () => boolean
  cb: (messages: SqsTransportMessage[]) => void
}) {
  const {
    sqs,
    queueUrl,
    requestAttemptId,
    waitTimeInSeconds,
    maxNumberOfMessages,
    isSnsMessage,
    newId,
    shouldContinue,
    cb,
  } = props

  const fn = async (attemptId: string) => {
    let keepSameAttemptId: boolean

    try {
      const result = await sqs
        .receiveMessage({
          QueueUrl: queueUrl,
          WaitTimeSeconds: waitTimeInSeconds,
          MaxNumberOfMessages: maxNumberOfMessages,
          ReceiveRequestAttemptId: attemptId,
          MessageAttributeNames: isSnsMessage ? undefined : ['All'],
        })
        .promise()

      const messages: SqsTransportMessage[] = (
        result.Messages || []
      ).map(isSnsMessage ? normalizeSnsMessage : normalizeSqsMessage)

      if (messages.length) {
        try {
          cb(messages)
        } catch {}
      }
    } catch (err) {
      // We need to keep same attemptId if there is a network error
      // to receive same set of items
      keepSameAttemptId = true
    }

    if (shouldContinue()) {
      fn(keepSameAttemptId ? attemptId : newId())
    }
  }

  fn(requestAttemptId)
}
