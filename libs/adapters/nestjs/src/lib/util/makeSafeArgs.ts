import { TransportCompactMessage } from '@cheep/transport'
import { CheepReferrerToken } from '../constants'

/** make an args-safe array out of a transport compact message */
export function makeSafeArgs(
  item: TransportCompactMessage,
): [unknown, ...unknown[]] {
  // make the referrer object
  const referrer = {
    metadata: item.metadata,
    route: item.route,
  }

  Reflect.defineMetadata(CheepReferrerToken, true, referrer)
  const args = Array.isArray(item.payload)
    ? (item.payload.concat([referrer]) as [unknown, ...unknown[]])
    : ([item.payload, referrer] as [unknown, ...unknown[]])
  return args
}
