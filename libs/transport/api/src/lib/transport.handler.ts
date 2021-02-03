import { MessageMetadata, Transport } from '@cheep/transport'
import { transportApi } from './transport.api'
import { createRouteBuilderProxy } from './createRouteBuilderProxy'
import { TransportHandler } from './types'

export interface CheepHandlerOptions<TPrefix> {
  executablePrefixes?: TPrefix[]
  joinSymbol?: string
}

export function transportHandler<TApi, TMetadata = MessageMetadata>(
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

    return transport.on(route, msg => {
      const api = transportApi(transport, {
        joinSymbol,
        executablePrefixes,
        referrer: {
          route: msg.route,
          metadata: msg.metadata,
        },
      })

      return handler.apply(null, [api, msg.payload, msg.metadata])
    })
  }

  return {
    on: onHandler,
  }
}
