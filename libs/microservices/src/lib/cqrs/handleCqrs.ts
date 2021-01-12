import { Transport } from '@cheep/transport'
import { constructRouteKey } from '../utils/constructRouteKey'
import { makeSafeArgs } from '../utils/makeSafeArgs'
import { CqrsType } from './constants'
import { CqrsApi, Handler, HandlerArg, HandlerMap } from './types'

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

export function handleCqrsSingle<
  TApi extends CqrsApi<string, HandlerMap, HandlerMap>,
  TTransport extends Transport = Transport
>(
  type: CqrsType,
  transport: TTransport,
  handlers: HandlerArg,
  namespace: TApi['namespace'],
) {
  buildRecursiveHandler(type, transport, namespace, handlers)
}

export function handleCqrsApi<
  TApi extends CqrsApi<string, HandlerMap, HandlerMap>
>(transport: Transport, api: TApi) {
  buildRecursiveHandler(
    CqrsType.Query,
    transport,
    api.namespace,
    api[CqrsType.Query],
  )

  buildRecursiveHandler(
    CqrsType.Command,
    transport,
    api.namespace,
    api[CqrsType.Command],
  )
}

/**
 * internal recursive function to build the handler tree
 * @param type @see handleCqrsSingle
 * @param transport @see handleCqrsSingle
 * @param handlers @see handleCqrsSingle
 * @param moduleName string of the module name
 * @param keyPrefix an array of key prefixes, used to track recursion depth
 */
function buildRecursiveHandler(
  type: CqrsType,
  transport: Transport,
  moduleName: string,
  handlers: HandlerArg,
  keyPrefix: string[] = [],
): void {
  switch (true) {
    // handlers is an array
    case Array.isArray(handlers):
      {
        const handlerArray = handlers as Handler[]
        handlerArray.map(h =>
          buildSingleHandler(type, transport, moduleName, h),
        )
      }
      break
    // handler is single function
    case typeof handlers === 'function':
      buildSingleHandler(
        type,
        transport,
        moduleName,
        handlers as Handler,
        keyPrefix.length ? keyPrefix : [(handlers as Handler).name],
      )

      break
    // it is safe to check object here, we have caught array above
    case typeof handlers === 'object':
      Object.entries(handlers as HandlerMap).flatMap(
        ([key, handler]) =>
          // call handle recursively, adding the object key to the keyPrefix array to track depth
          buildRecursiveHandler(
            type,
            transport,
            moduleName,
            handler,
            keyPrefix.concat([key]),
          ),
      )
      break
    default:
      break
  }
}

function buildSingleHandler<T extends Handler>(
  type: CqrsType,
  transport: Transport,
  moduleName: string,
  handler: T,
  keyPrefix: string[] = [],
): void {
  const routeKey = constructRouteKey({
    moduleName,
    busType: type,
    functionName: keyPrefix,
  })

  transport.on(routeKey, item => {
    const args = makeSafeArgs(item)
    return handler(...args)
  })
}
