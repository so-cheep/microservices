import { filter } from 'rxjs/operators'

import { ITransport, ITransportItem } from '@nx-cqrs/cqrs/types'

import { CqrsType } from './constants'
import { constructRouteKey } from './utils/constructRouteKey'
import { decodeRpc } from './utils/decodeRpc'
import {
  IRpcMetadata,
  THandler,
  THandlerArg,
  IHandlerMap,
} from './types'

/**
 *
 * @param type the CQRS type to handle for
 * @param transport a valid CQRS transport
 * @param handlers either a single function, an array of functions, or an object (optionally recursive)
 * with leaf values which are functions.
 *
 * _All functions __must__ be async or return a Promise_
 * @param keyPrefix
 */

export function handle(
  type: CqrsType,
  transport: ITransport<IRpcMetadata>,
  handlers: THandlerArg,
) {
  const keys = buildRecursiveHandler(type, transport, handlers)
  if (keys.length === 0) {
    transport.listenPatterns(keys)
  }
}

/**
 * internal recursive function to build the handler tree
 * @param type @see handle
 * @param transport @see handle
 * @param handlers @see handle
 * @param keyPrefix an array of key prefixes, used to track recursion depth
 */
function buildRecursiveHandler(
  type: CqrsType,
  transport: ITransport<IRpcMetadata>,
  handlers: THandlerArg,
  keyPrefix: string[] = [],
): string[] {
  let routeKeys: string[]
  switch (true) {
    // handlers is an array
    case Array.isArray(handlers):
      {
        routeKeys = (handlers as THandler[]).map(h =>
          buildSingleHandler(type, transport, h),
        )
      }
      break
    // handler is single function
    case typeof handlers === 'function':
      routeKeys = [
        buildSingleHandler(
          type,
          transport,
          handlers as THandler,
          keyPrefix.length
            ? keyPrefix
            : [(handlers as THandler).name],
        ),
      ]
      break
    // it is safe to check object here, we have caught array above
    case typeof handlers === 'object':
      routeKeys = Object.entries(handlers as IHandlerMap).flatMap(
        ([key, handler]) =>
          // call handle recursively, adding the object key to the keyPrefix array to track depth
          buildRecursiveHandler(
            type,
            transport,
            handler,
            keyPrefix.concat([key]),
          ),
      )
      break
    default:
      break
  }
  return routeKeys
}

function buildSingleHandler<T extends THandler>(
  type: CqrsType,
  transport: ITransport<IRpcMetadata>,
  handler: T,
  keyPrefix: string[] = [],
): string {
  const routeKey = constructRouteKey({
    busType: type,
    functionName: keyPrefix,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = (
    transportItem: ITransportItem<IRpcMetadata>,
  ): ReturnType<T> =>
    handler.apply(
      handler,
      decodeRpc(transportItem.message as string)
        // NOTE: add the metadata object on the end for utility
        .concat([transportItem.metadata]),
    )
  transport.message$
    .pipe(filter(t => t.route.includes(routeKey)))
    .subscribe(transportItem => {
      try {
        switch (type) {
          case CqrsType.Query:
            {
              // ack the message immediately
              transportItem.complete(true)
              handle(transportItem)
                .then(result => {
                  // for now, just sending the original metadata back
                  // TODO(kb): determine whether to send different metadata
                  transportItem.sendReply(result, {
                    ...transportItem.metadata,
                    replyTime: new Date().toISOString(),
                  })
                })
                .catch(err => {
                  transportItem.sendReply(undefined, {
                    ...transportItem.metadata,
                    error: err,
                    replyTime: new Date().toISOString(),
                  })
                })
            }
            break
          case CqrsType.Command:
            {
              handle(transportItem)
                .then(result => {
                  transportItem.complete(true)
                  if (result) {
                    transportItem.sendReply(result, {
                      ...transportItem.metadata,
                      replyTime: new Date().toISOString(),
                    })
                  }
                })
                .catch(err => {
                  transportItem.complete(false)
                  throw err
                })
            }
            break
        }
      } catch (err) {
        //
      }
    })
  return routeKey
}
