import { MessageMetadata, Transport } from '@cheep/transport'
import { recursiveApiCaller } from './recursiveApiCaller'

export interface TransportApiOptions<TPrefix> {
  executablePrefixes?: TPrefix[]
  joinSymbol?: string
  referrer?: {
    route: string
    metadata: MessageMetadata
  }
}

export function transportApi<TApi>(
  transport: Transport,
  options?: TransportApiOptions<keyof TApi>,
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
