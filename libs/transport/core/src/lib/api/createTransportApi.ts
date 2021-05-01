import { MessageMetadata, Transport } from '../transport'
import { recursiveApiCaller } from './recursiveApiCaller'
import {
  Api,
  ApiWithExecutableKeys,
  ExecutableApi,
  TransportApi,
  TransportApiOptions,
} from './types'

export function createTransportApi<
  TApi extends ApiWithExecutableKeys
>(
  transport: Transport,
  options?: {
    joinSymbol?: string
    metadata?: MessageMetadata
  },
  referrer?: {
    route: string
    metadata: MessageMetadata
  },
): TransportApi<TApi['api'], TApi['executableKeys']> {
  const { joinSymbol = '.', metadata } = options ?? {}

  return <any>{
    execute: transportApi(transport, {
      mode: 'EXECUTE',
      joinSymbol,
      metadata,
      referrer,
    }),
    publish: transportApi(transport, {
      mode: 'PUBLISH',
      joinSymbol,
      metadata,
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
