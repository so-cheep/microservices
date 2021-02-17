import {
  MessageMetadata,
  RawHandler,
  Transport,
  TransportCompactMessage,
  TransportMessage,
} from '@cheep/transport'
import { TransportApi } from '@cheep/transport-api'
import {
  DeepPartial,
  getLeafAddresses,
  ReplaceLeaves,
} from '@cheep/utils'

export function createRouter<
  TLocalApi extends TransportApi,
  TRouterArgs extends Record<string, unknown>
>(props: {
  /** unique id of this router, to avoid looping */
  routerId: string
  transport: Transport
  nextHops: NextHop<TRouterArgs>[]
  /** RPC timeout in `ms`, if not provided will fall back to the transport default */
  rpcTimeout?: number
  broadcastForwardPaths?: DeepPartial<
    ReplaceLeaves<TLocalApi, boolean>
  >
  joinPrefix?: string
}) {
  const outstandingRpcs = new Map<string, (...args) => unknown>()
  const {
    routerId,
    transport,
    nextHops,
    rpcTimeout = props.transport['options']['defaultRpcTimeout'],
  } = props

  const broadcastPrefixes = props.broadcastForwardPaths
    ? getLeafAddresses(props.broadcastForwardPaths)
        .filter(([_, include]) => include)
        .map(([path]) => path.join(props.joinPrefix ?? '.'))
    : []

  const onEveryHandler: RawHandler = (item, msg) => {
    // remove the routerAddress from the route
    if (checkLastHop(item.metadata, routerId)) {
      return Promise.resolve()
    }

    const revisedItem = {
      ...msg,
      ...item,
      metadata: addVisitedRouterToMeta(item.metadata, routerId),
    }

    // route the message to next hops

    const isBroadcast = broadcastPrefixes.some(p =>
      item.route.startsWith(p),
    )
    nextHops.forEach(h => sendNextHop(h, isBroadcast, revisedItem))

    if (msg.replyTo && !isBroadcast) {
      const rpcPromise = new Promise((resolve, reject) => {
        outstandingRpcs.set(msg.correlationId, resolve)
        setTimeout(() => {
          outstandingRpcs.delete(msg.correlationId)
          reject(Error('Router RPC Timeout'))
          // TODO: improve RPC timeout story, pass rpc timeout along with message data
        }, rpcTimeout ?? 5000)
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
          const rpcPromise = outstandingRpcs.get(item.correlationId)
          if (rpcPromise) {
            // resolve the outstanding promise
            rpcPromise(item.payload)
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
