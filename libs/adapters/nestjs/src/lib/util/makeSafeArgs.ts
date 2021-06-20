import {
  MessageMetadata,
  Referrer,
  TransportCompactMessage,
} from '@cheep/transport'
import { CheepReferrerToken } from '../constants'

/** make an args-safe array out of a transport compact message */
export function makeSafeArgs(
  item: TransportCompactMessage,
): [unknown, ...unknown[]] {
  // make the referrer object
  const referrer = makeReferrer(item)

  const args = Array.isArray(item.payload)
    ? (item.payload.concat([referrer]) as [unknown, ...unknown[]])
    : ([item.payload, referrer] as [unknown, ...unknown[]])
  return args
}

export function makeReferrer<
  TMeta extends MessageMetadata = MessageMetadata
>(item: TransportCompactMessage): Referrer<TMeta> {
  const referrer = {
    metadata: item.metadata as TMeta,
    route: item.route,
  }
  Reflect.defineMetadata(CheepReferrerToken, true, referrer)
  return referrer
}
