import type { TransportCompactMessage } from '@cheep/transport'
import type { AllFunctionArgs } from '@cheep/utils/types'

/** create a routable remote api */
export type Router<
  TRemoteApi,
  TRouterArgs extends Record<string, unknown>
> = {
  $: (arg: TRouterArgs) => TRemoteApi
}

/**
 * A deep replacement across an api, allowing for functions at any node in the tree,
 * whose args will union the args contained in the sub tree it replaces. Aka VOODO.
 *
 */
export type FilterMap<TApi, TReturnValue> = {
  [K in keyof TApi]: TApi[K] extends (...args: infer A) => unknown
    ? (item: TransportCompactMessage<A>) => TReturnValue
    : // if not a function, then union the recursion of this type and a function with the union of all args beneath
      | FilterMap<TApi[K], TReturnValue>
        | ((
            item: TransportCompactMessage<AllFunctionArgs<TApi[K]>>,
          ) => TReturnValue)
}
