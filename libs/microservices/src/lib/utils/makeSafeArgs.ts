import {
  MessageMetadata,
  Referrer,
  TransportCompactMessage,
} from '@cheep/transport'
import { MetdataToken } from '../constants'

/** make an args-safe array out of a transport compact message */
export function makeSafeArgs(
  item: TransportCompactMessage,
): [unknown, ...unknown[]] {
  // make the referrer object
  const referrer = makeReferrer

  const args = Array.isArray(item.message)
    ? (item.message.concat([referrer]) as [unknown, ...unknown[]])
    : ([item.message, referrer] as [unknown, ...unknown[]])
  return args
}

export function makeReferrer<
  TMeta extends MessageMetadata = MessageMetadata
>(item: TransportCompactMessage): Referrer<TMeta> {
  const referrer = {
    metadata: item.metadata as TMeta,
    route: item.route,
  }
  Reflect.defineMetadata(MetdataToken, true, referrer)
  return referrer
}
