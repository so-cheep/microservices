import { MessageMetadata, Transport } from '@cheep/transport'
import { Api, ApiWithExecutableKeys, TransportApi } from './types'
import { transportApi } from './transport.api'

export function createTransportApi<
  TApi extends ApiWithExecutableKeys
>(
  transport: Transport,
  options?: {
    joinSymbol?: string
  },
  referrer?: {
    route: string
    metadata: MessageMetadata
  },
): TransportApi<TApi['api'], TApi['executableKeys']> {
  const { joinSymbol = '.' } = options ?? {}

  return <any>{
    execute: transportApi(transport, {
      mode: 'EXECUTE',
      joinSymbol,
      referrer,
    }),
    publish: transportApi(transport, {
      mode: 'PUBLISH',
      joinSymbol,
      referrer,
    }),
  }
}
