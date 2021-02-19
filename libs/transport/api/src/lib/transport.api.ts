import { Transport } from '@cheep/transport'
import { recursiveApiCaller } from './recursiveApiCaller'
import { Api, ExecutableApi, TransportApiOptions } from './types'

export function transportApi<TApi extends Api>(
  transport: Transport,
  options?: TransportApiOptions,
): ExecutableApi<TApi> {
  const { joinSymbol = '.' } = options ?? {}

  return <any>recursiveApiCaller(transport, {
    ...options,
    joinSymbol,
  })
}
