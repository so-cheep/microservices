import {
  Transport,
  TransportCompactMessage,
  TransportMessage,
} from '@cheep/transport'

export function createRouter<
  TRemoteApi,
  TRouterArgs extends Record<string, unknown>
>(props: {
  /** the cheep api routing key that should prefix all messages routed from the transport to the next hops */
  routerAddress: string
  transport: Transport
  nextHops: NextHop<TRouterArgs>[]
  /** RPC timeout in `ms`, if not provided will fall back to the transport default */
  rpcTimeout?: number
}) {
  const outstandingRpcs = new Map<string, (...args) => unknown>()
  const {
    transport,
    routerAddress,
    nextHops,
    rpcTimeout = props.transport['options']['defaultRpcTimeout'],
  } = props

  const routeRewriteRegExp = new RegExp(
    `^${routerAddress.replace('.', '\\.')}.`,
  )

  // subscribe to anything destined for the router on the transport
  transport.onEvery(
    routerAddress,
    (item, msg) => {
      // remove the routerAddress from the route
      const revisedRoute = item.route.replace(routeRewriteRegExp, '')
      const revisedItem = { ...msg, ...item, route: revisedRoute }

      // route the message to next hops
      nextHops.forEach(h => sendNextHop(h, revisedItem))

      if (msg.replyTo) {
        const rpcPromise = new Promise((resolve, reject) => {
          outstandingRpcs.set(msg.correlationId, resolve)
          setTimeout(() => {
            outstandingRpcs.delete(msg.correlationId)
            reject('Router RPC Timeout')
          }, rpcTimeout)
        })
        return rpcPromise
      }

      // if not an RPC, the best we can do is send on to next hop, so just resolve
      return Promise.resolve()
    },
    true,
  )

  nextHops.forEach(target => {
    switch (target.type) {
      case 'TUNNEL':
        target.registerReceiver(async (tunnelId, item) => {
          // TODO: cover edge case where corelation ids collide across tunnels
          const rpcPromise = outstandingRpcs.get(item.correlationId)
          if (rpcPromise) {
            // TODO: figure out how we provide updated metadata as well, so we can capture full call stack
            rpcPromise(item.payload)
          } else {
            const props = {
              route: item.route,
              payload: item.payload,
              metadata: {
                ...item.metadata,
                ...tunnelId,
              },
              referrer: {
                metadata: item.metadata,
                route: item.route,
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
                message: '',
                metadata: item.metadata,
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
  TransportMessage

export interface TunnelNextHop<
  TTunnelId extends Record<string, unknown> = Record<string, unknown>
> {
  type: 'TUNNEL'
  exampleTunnelId: TTunnelId
  send: (tunnelId: TTunnelId, item: CompleteMessage) => void
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
  item: CompleteMessage,
) {
  switch (target.type) {
    case 'TUNNEL': {
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

// function receiveNextHop(
//   target: NextHop,
//   transport: Transport,
//   routeAddress: string,
// ) {}
