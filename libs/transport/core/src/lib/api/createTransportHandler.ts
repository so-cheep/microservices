import {
  MessageMetadata,
  Transport,
  TransportCompactMessage,
} from '../transport'
import { createRouteBuilderProxy } from './createRouteBuilderProxy'
import { ApiWithExecutableKeys, TransportHandler } from './types'
import { createTransportApi } from './createTransportApi'

export interface TransportHandlerOptions {
  joinSymbol?: string
}

export function createTransportHandler<
  TApi extends ApiWithExecutableKeys,
  TMetadata = MessageMetadata
>(
  transport: Transport,
  options?: TransportHandlerOptions,
): TransportHandler<TApi, TMetadata> {
  const { joinSymbol = '.' } = options ?? {}

  function onHandler(
    routePick: (o: any) => any,
    handler: (...args: any[]) => Promise<unknown | void>,
  ) {
    const proxy = (routePick(
      createRouteBuilderProxy(joinSymbol),
    ) as unknown) as () => string

    const route = proxy()

    const intermediateHandler = async (
      msg: TransportCompactMessage<unknown[]>,
    ) => {
      const api = createTransportApi(transport, options, {
        route: msg.route,
        metadata: msg.metadata,
      })

      const result = await handler(api, ...msg.payload, msg.metadata)
      return result
    }

    Object.defineProperty(intermediateHandler, 'name', {
      value: `Cheep[${handler.name ?? 'Handler'}]@[${route}]`,
      configurable: true,
    })

    return transport.on(route, intermediateHandler)
  }

  return {
    on: <any>onHandler,
  }
}
