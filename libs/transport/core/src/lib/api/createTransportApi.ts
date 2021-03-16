import { MessageMetadata, Transport } from '../transport'
import {
  Api,
  ApiWithExecutableKeys,
  TransportApi,
  ExecutableApi,
  TransportApiOptions,
} from './types'
import { recursiveApiCaller } from './recursiveApiCaller'

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

function transportApi<TApi extends Api>(
  transport: Transport,
  options?: TransportApiOptions,
): ExecutableApi<TApi> {
  const { joinSymbol = '.' } = options ?? {}

  return <any>recursiveApiCaller(transport, {
    ...options,
    joinSymbol,
  })
}
