import {
  MessageMetadata,
  Transport,
  TransportCompactMessage,
} from '@cheep/transport'
import { transportApi } from './transport.api'
import { createRouteBuilderProxy } from './createRouteBuilderProxy'
import {
  Api,
  CallableApi,
  RouteMapReturn,
  TransportHandler,
} from './types'

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

  function onHandler<
    TRoutePick extends RouteMapReturn<unknown[], string[], unknown>,
    TPayload extends unknown[] = TRoutePick extends RouteMapReturn<
      infer P,
      string[],
      unknown
    >
      ? P
      : never
  >(
    routePick: (o: any) => TRoutePick,
    handler: (
      api: CallableApi<TApi>,
      ...args: [...TPayload, TMetadata]
    ) => Promise<unknown | void>,
  ) {
    const proxy = (routePick(
      createRouteBuilderProxy(joinSymbol),
    ) as unknown) as () => string

    const route = proxy()

    const intermediateHandler = (
      msg: TransportCompactMessage<TPayload>,
    ) => {
      const api = transportApi(transport, {
        joinSymbol,
        executablePrefixes,
        referrer: {
          route: msg.route,
          metadata: msg.metadata,
        },
      })

      const result = handler(
        api,
        ...msg.payload,
        msg.metadata as TMetadata,
      )
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
