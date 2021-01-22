import { MessageMetadata, MetadataRule } from '../transport'

/**
 * Adds new `callStack` metadata
 */
export function callStackRule() {
  const rule: MetadataRule<MessageMetadata> = x => {
    if (x.referrerRoute) {
      const callStack = <string[]>x.referrerMetadata?.callStack ?? []

      callStack.push(x.referrerRoute)

      return { callStack }
    }

    return { callStack: [] }
  }

  return rule
}
