import { MessageMetadata, MetadataRule } from '../transport'

/**
 * Adds new `createdAt` metadata
 * @param dateNow - function which will return current date representation in string or number
 */
export function createdAtRule(dateNow: () => string | number) {
  const rule: MetadataRule<MessageMetadata> = _ => ({
    createdAt: dateNow(),
  })

  return rule
}
