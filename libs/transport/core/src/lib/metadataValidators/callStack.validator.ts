import { RecursionCallError } from '../recursion.error'
import { TransportMessage } from '../transport'

export function callStackValidator() {
  return (msg: TransportMessage) => {
    const callStack = <string[]>msg.metadata.callStack ?? []

    if (callStack.length && callStack.includes(msg.route)) {
      const transactionId = <string>msg.metadata.transactionId

      throw new RecursionCallError(
        transactionId,
        msg.route,
        callStack,
      )
    }
  }
}
