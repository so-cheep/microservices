import { CallStackMetadata } from '../metadataReducers/callStack.reducer'
import { RecursionCallError } from '../recursion.error'
import { ValidatorMessage } from '../transport'

export function callStackValidator(
  prefixesToCheck: string[] | 'all',
) {
  return (msg: ValidatorMessage<CallStackMetadata>) => {
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
