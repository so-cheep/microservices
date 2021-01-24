import { MessageMetadata, Transport } from '@cheep/transport'
import { recursiveApiCaller } from './recursiveApiCaller'

export interface CheepApiOptions<TPrefix> {
  executablePrefixes?: TPrefix[]
  joinSymbol?: string
  referrer?: {
    route: string
    metadata: MessageMetadata
  }
}

export function cheepApi<TApi>(
  transport: Transport,
  options?: CheepApiOptions<keyof TApi>,
): TApi {
  const {
    executablePrefixes = ['Command', 'Query'],
    joinSymbol = '.',
    referrer,
  } = options ?? {}

  return <any>recursiveApiCaller(transport, {
    executablePrefixes: <string[]>executablePrefixes,
    joinSymbol,
    referrer,
  })
}
