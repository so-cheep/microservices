import type { TransportCompactMessage } from '@cheep/transport'

/** make an args-safe array out of a transport compact message */
export function makeSafeArgs(
  item: TransportCompactMessage,
): [unknown, ...unknown[]] {
  const args = Array.isArray(item.message)
    ? (item.message.concat([item.metadata]) as [
        unknown,
        ...unknown[]
      ])
    : ([item.message, item.metadata] as [unknown, ...unknown[]])
  return args
}
