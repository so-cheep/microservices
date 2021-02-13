import {
  MessageMetadata,
  Transport,
  TransportCompactMessage,
} from '@cheep/transport'
import { transportApi } from './transport.api'
import { createRouteBuilderProxy } from './createRouteBuilderProxy'
import { Api, TransportHandler } from './types'

export interface CheepHandlerOptions<TPrefix> {
  executablePrefixes?: TPrefix[]
  joinSymbol?: string
}

export function transportHandler<
  TApi extends Api,
  TMetadata = MessageMetadata
>(
  transport: Transport,
  options?: CheepHandlerOptions<keyof TApi>,
): TransportHandler<TApi, TMetadata> {
  const { joinSymbol = '.', executablePrefixes } = options ?? {}

  function onHandler(
    routePick: (o: any) => any,
    handler: (...args: any[]) => Promise<unknown | void>,
  ) {
    const proxy = (routePick(
      createRouteBuilderProxy(joinSymbol),
    ) as unknown) as () => string

    const route = proxy()

    const intermediateHandler = (
      msg: TransportCompactMessage<unknown[]>,
    ) => {
      const api = transportApi(transport, {
        joinSymbol,
        executablePrefixes,
        referrer: {
          route: msg.route,
          metadata: msg.metadata,
        },
      })

      const result = handler(api, ...msg.payload, msg.metadata)
      return Promise.resolve(result)
    }

    Object.defineProperty(intermediateHandler, 'name', {
      value: `Cheep[${handler.name ?? 'Handler'}]@[${route}]`,
      configurable: true,
    })
    return transport.on(route, intermediateHandler)
  }

  return {
    on: onHandler,
  }
}
