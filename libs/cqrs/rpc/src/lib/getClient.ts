import { ITransport } from '@nx-cqrs/cqrs/types'
import { constructRouteKey } from './utils/constructRouteKey'
import { decodeRpc } from './utils/decodeRpc'
import { encodeRpc } from './utils/encodeRpc'
import { CqrsType } from './constants'
import { IRpcMetadata, IRpcOptions, IHandlerMap } from './types'

export function getClient<Handler extends IHandlerMap>(
  type: CqrsType,
  transport: ITransport<IRpcMetadata>,
  options?: IRpcOptions,
): Handler {
  return recursiveHandler(type, transport, options)
}

function recursiveHandler(
  type: CqrsType,
  transport: ITransport<IRpcMetadata>,
  options?: IRpcOptions,
  /** only needed internally, **DO NOT SET** */
  path: string[] = [],
) {
  // make array safe
  return new Proxy(() => undefined, {
    get: (_, propertyName) => {
      return recursiveHandler(
        type,
        transport,
        options,
        path.concat([String(propertyName)]),
      )
    },
    // eslint-disable-next-line @typescript-eslint/ban-types
    apply: (_, fn: Function, args: unknown[]) => {
      const routeKey = constructRouteKey({
        busType: type,
        functionName: path,
      })
      return transport
        .publish<string, IRpcMetadata>({
          message: encodeRpc(args),
          metadata: { callTime: new Date().toISOString() },
          route: routeKey,
          rpc: {
            timeout: 5000,
            ...options,
            enabled: true,
          },
        })
        .then(result => {
          if (result.metadata?.error) {
            throw result.metadata.error
          }
          return decodeRpc(result?.result)
        })
    },
  })
}
