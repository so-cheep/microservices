import { MessageMetadata, Transport } from '@cheep/transport'
import { cheepApi } from './cheep.api'
import { createRouteBuilderProxy } from './createRouteBuilderProxy'
import { CheepHandler } from './types'

export interface CheepHandlerOptions<TPrefix> {
  executablePrefixes?: TPrefix[]
  joinSymbol?: string
}

export function cheepHandler<TApi, TMetadata = MessageMetadata>(
  transport: Transport,
  options?: CheepHandlerOptions<keyof TApi>,
): CheepHandler<TApi, TMetadata> {
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
      const api = cheepApi(transport, {
        joinSymbol,
        executablePrefixes,
        referrer: {
          route: msg.route,
          metadata: msg.metadata,
        },
      })

      return handler.apply(null, [api, msg.message, msg.metadata])
    })
  }

  return {
    on: onHandler,
  }
}
