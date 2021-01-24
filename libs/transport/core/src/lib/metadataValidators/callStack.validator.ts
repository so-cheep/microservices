import { CallStackMetadata } from '../metadataReducers/callStack.reducer'
import { RecursionCallError } from '../recursion.error'
import { TransportMessage } from '../transport'

export function callStackValidator(
  prefixesToCheck: string[] | 'all',
) {
  return (msg: TransportMessage<CallStackMetadata>) => {
    const callStack = <string[]>msg.metadata.callStack ?? []

    if (
      callStack.length &&
      (prefixesToCheck === 'all' ||
        prefixesToCheck.some(p => msg.route.startsWith(p))) &&
      callStack.includes(msg.route)
    ) {
      const transactionId = <string>msg.metadata.transactionId

      throw new RecursionCallError(
        transactionId,
        msg.route,
        callStack,
      )
    }
  }
}
