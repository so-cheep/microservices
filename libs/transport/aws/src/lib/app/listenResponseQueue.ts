import { SqsTransportMessage } from '../types'
import { listenQueue } from './listenQueue'

export function listenResponseQueue(props: {
  sqs: AWS.SQS
  responseQueueUrl: string
  newId: () => string
  shouldContinue: () => boolean
  cb: (messages: SqsTransportMessage[]) => void
}) {
  const { sqs, responseQueueUrl, newId, shouldContinue, cb } = props

  listenQueue({
    sqs,
    queueUrl: responseQueueUrl,
    maxNumberOfMessages: 1,
    waitTimeInSeconds: 1,
    isSnsMessage: false,
    requestAttemptId: newId(),
    newId,
    shouldContinue,
    cb,
  })
}
