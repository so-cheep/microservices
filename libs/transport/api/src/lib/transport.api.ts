import { Transport } from '@cheep/transport'
import { recursiveApiCaller } from './recursiveApiCaller'
import { Api, CallableApi, TransportApiOptions } from './types'

export function transportApi<TApi extends Api>(
  transport: Transport,
  options?: TransportApiOptions<keyof TApi>,
): CallableApi<TApi> {
  const { joinSymbol = '.' } = options ?? {}

  return <any>recursiveApiCaller(transport, {
    ...options,
    joinSymbol,
  })
}
