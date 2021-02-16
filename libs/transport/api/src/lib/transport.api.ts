import { Transport } from '@cheep/transport'
import { recursiveApiCaller } from './recursiveApiCaller'
import { Api, CallableApi, TransportApiOptions } from './types'

export function transportApi<TApi extends Api>(
  transport: Transport,
  options?: TransportApiOptions<keyof TApi>,
): CallableApi<TApi> {
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
