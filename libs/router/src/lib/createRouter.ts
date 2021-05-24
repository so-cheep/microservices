import {
  Api,
  MessageMetadata,
  RawHandler,
  Transport,
  TransportCompactMessage,
  TransportMessage,
  WILL_NOT_HANDLE,
} from '@cheep/transport'
import { getLeafAddresses } from '@cheep/utils'
import { FilterMap } from './types'

export function createRouter<
  TLocalApi extends Api,
  TRouterArgs extends Record<string, unknown>
>(props: {
  /** unique id of this router, to avoid looping */
  routerId: string
  transport: Transport
  nextHops: NextHop<TRouterArgs>[]
  /** RPC timeout in `ms`, if not provided will fall back to the transport default */
  rpcTimeout?: number
  /**
   * Tree of the outbound, unrouted paths, which should be forwarded by the router
   *
   * ### Valid leaf values:
   *   - **function**:
   *     will receive the original payload as an arg, and should either return:
   *       - `true`: broadcast all messages matching this path to all available next hops
   *       - `false`: drop the message
   *       - `object: TRouter`: an object matching the TRouterArgs definition, which will be merged into the metadata
   * and used for routing
   */
  outboundFilters?: FilterMap<TLocalApi, TRouterArgs | boolean>

  joinPrefix?: string
}) {
  const outstandingRpcs = new Map<
    string,
    { timeout: NodeJS.Timeout; resolve: (...args) => unknown }
  >()
  const {
    routerId,
    transport,
    nextHops,
    rpcTimeout = props.transport['options']['defaultRpcTimeout'],
  } = props
  type TFilterFunction = (...args) => boolean | TRouterArgs

  // flatten the outbound filter map to an array for faster processing
  const broadcastPrefixes = props.outboundFilters
    ? getLeafAddresses<TFilterFunction>(props.outboundFilters)
        // remove any paths that have a falsy leaf
        .filter(([_, leaf]) => !!leaf)
        // stringify the remaining leaves, and ensure the return is a function
        .map<[string, TFilterFunction]>(([path, leaf]) => [
          path.join(props.joinPrefix ?? '.'),
          leaf,
        ])
    : []

  const onEveryHandler: RawHandler = (item, msg) => {
    // remove the routerAddress from the route
    if (checkLastHop(item.metadata, routerId)) {
      return Promise.reject(WILL_NOT_HANDLE)
    }

    // check to see if we match any filters
    const routeFilter = broadcastPrefixes.find(([p]) =>
      item.route.startsWith(p),
    )

    // TODO: make the item arg a deep copy or freeze it before passing to route filter
    const result = routeFilter ? routeFilter[1](item) : false
    const isBroadcast = typeof result === 'boolean' && result
    const metadata =
      typeof result === 'object'
        ? { ...item.metadata, ...result }
        : item.metadata

    const revisedItem = {
      ...msg,
      ...item,
      metadata: addVisitedRouterToMeta(metadata, routerId),
    }

    //TODO: next hop should throw if it knows it won't handle something
    nextHops.forEach(h => sendNextHop(h, isBroadcast, revisedItem))

    if (msg.replyTo && !isBroadcast) {
      const rpcPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          outstandingRpcs.delete(msg.correlationId)
          reject(Error('Router RPC Timeout'))
          // TODO: improve RPC timeout story, pass rpc timeout along with message data
        }, rpcTimeout ?? 5000)

        outstandingRpcs.set(msg.correlationId, { resolve, timeout })
      })
      return rpcPromise
    }

    // if not an RPC, the best we can do is send on to next hop, so just resolve
    return Promise.resolve()
  }

  Object.defineProperty(onEveryHandler, 'name', {
    value: `CheepRouter[${routerId}]`,
    configurable: true,
  })

  // subscribe to anything destined for the router on the transport
  transport.onEvery('', onEveryHandler, true)

  nextHops.forEach(target => {
    switch (target.type) {
      case 'TUNNEL':
        target.registerReceiver(async (tunnelId, item) => {
          // bail out if we're getting our own message
          if (checkLastHop(item.metadata, routerId)) {
            return
          }
          // TODO: cover edge case where corelation ids collide across tunnels
          const rpcItem = outstandingRpcs.get(item.correlationId)
          if (rpcItem) {
            const { resolve, timeout } = rpcItem
            // resolve the outstanding promise
            clearTimeout(timeout)
            resolve(item.payload)
            outstandingRpcs.delete(item.correlationId)
          } else {
            const props = {
              route: item.route,
              payload: item.payload,
              metadata: addVisitedRouterToMeta(
                {
                  ...item.metadata,
                  ...tunnelId,
                },
                routerId,
              ),
              referrer: {
                metadata: item.metadata,
                route: routerId,
              },
            }
            if (item.replyTo && item.correlationId) {
              const result = await transport.execute({
                ...props,
              })

              // send reply
              target.send(tunnelId, {
                payload: result,
                correlationId: item.correlationId,
                replyTo: null,
                metadata: addVisitedRouterToMeta(
                  item.metadata,
                  routerId,
                ),
                route: item.route,
              })
            } else {
              // non rpc, just publish
              await transport.publish(props)
            }
          }
        })
    }
  })
}

export type CompleteMessage = TransportCompactMessage &
  Pick<TransportMessage, 'replyTo' | 'correlationId'>

export interface TunnelNextHop<
  TTunnelId extends Record<string, unknown> = Record<string, unknown>
> {
  type: 'TUNNEL'
  exampleTunnelId: TTunnelId
  send: (tunnelId: TTunnelId, item: CompleteMessage) => void
  broadcast?: (item: CompleteMessage) => void
  registerReceiver: (
    receiver: (
      tunnelId: TTunnelId,
      item: CompleteMessage,
    ) => Promise<void>,
  ) => void
}

export type NextHop<
  TRouterArgs extends Record<string, unknown>
> = TunnelNextHop<TRouterArgs>

function sendNextHop<TRouterArgs extends Record<string, unknown>>(
  target: NextHop<TRouterArgs>,
  isBroadcast: boolean,
  item: CompleteMessage,
) {
  switch (target.type) {
    case 'TUNNEL': {
      // short circuit to broadcast
      if (isBroadcast) {
        target.broadcast(item)
        return
      }

      // pluck just the tunnelId keys from metadata
      const idKeys = Object.keys(target.exampleTunnelId)
      const tunnelId = Object.fromEntries(
        Object.entries(item.metadata).map(([k, v]) =>
          idKeys.includes(k) ? [k, v] : [undefined, undefined],
        ),
      ) as TRouterArgs
      return target.send(tunnelId, item)
    }
  }
}

function getVisitedRouters(metadata: MessageMetadata): string[] {
  return (metadata._visitedRouters as string[]) ?? []
}

function addVisitedRouterToMeta(
  metadata: MessageMetadata,
  routerId: string,
): MessageMetadata & { _visitedRouters: string[] } {
  return {
    ...metadata,
    _visitedRouters: getVisitedRouters(metadata).concat([routerId]),
  }
}

function checkLastHop(
  metadata: MessageMetadata,
  routerId: string,
): boolean {
  const routers = getVisitedRouters(metadata)
  return routers[routers.length - 1] === routerId
}

// function receiveNextHop(
//   target: NextHop,
//   transport: Transport,
//   routeAddress: string,
// ) {}
