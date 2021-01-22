import { MessageMetadata, MetadataRule } from '../transport'

/**
 * Adds new `transactionId` metadata
 * @param newId - function which will always return unique string
 */
export function transactionIdRule(newId: () => string) {
  const rule: MetadataRule<MessageMetadata> = x => ({
    transactionId: x.referrerMetadata?.transactionId ?? newId(),
  })

  return rule
}
