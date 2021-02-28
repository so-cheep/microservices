import { MessageMetadata, Referrer } from '@cheep/transport'
import { CheepReferrerToken } from '../constants'

/** safely extract the referrer from the args payload */
export function processArgsSafely(
  args: unknown[],
): { payload: unknown[]; referrer: Referrer | undefined } {
  const lastArg = args.slice(-1).pop()
  const isLastArgReferrer =
    lastArg &&
    typeof lastArg === 'object' &&
    Reflect.hasOwnMetadata(CheepReferrerToken, lastArg)

  const referrer = isLastArgReferrer
    ? (lastArg as MessageMetadata)
    : undefined

  const message = isLastArgReferrer ? args.slice(0, -1) : args

  return {
    referrer,
    payload: message,
  }
}
