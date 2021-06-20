import type { Api, TransportCompactMessage } from '@cheep/transport'
import type { AllFunctionArgs } from '@cheep/utils'
import type { BROADCAST } from './constants'

/**
 * A deep replacement across an api, allowing for functions at any node in the tree,
 * whose args will union the args contained in the sub tree it replaces. Aka VOODO.
 *
 */
export type RouterFilterMap<TApi, TReturnValue> = Partial<
  {
    [K in keyof TApi]: TApi[K] extends (...args: infer A) => unknown
      ? (item: TransportCompactMessage<A>) => TReturnValue
      : // if not a function, then union the recursion of this type and a function with the union of all args beneath
        | RouterFilterMap<TApi[K], TReturnValue>
          | ((
              item: TransportCompactMessage<AllFunctionArgs<TApi[K]>>,
            ) => TReturnValue)
  } & {
    /**
     * this is a *wildcard* filter
     * which will be used for any routes that match up to this point of the tree,
     * but that do not match any of the supplied handlers deeper than this point
     */
    '': (
      item: TransportCompactMessage<AllFunctionArgs<TApi>>,
    ) => TReturnValue
  }
>

export type OutboundRouterFilterReturn<TRouterArgs> =
  | TRouterArgs
  | boolean
  | typeof BROADCAST

export type OutboundRouterFilter<
  TLocalApi extends Api = Api,
  TRouterArgs extends Record<string, unknown> = Record<
    string,
    unknown
  >
> = RouterFilterMap<
  TLocalApi,
  OutboundRouterFilterReturn<TRouterArgs>
>

export type InboundRouterFilterReturn<TRouterArgs> =
  | TRouterArgs
  | boolean

export type InboundRouterFilter<
  TLocalApi extends Api = Api,
  TRouterArgs extends Record<string, unknown> = Record<
    string,
    unknown
  >
> = RouterFilterMap<TLocalApi, InboundRouterFilterReturn<TRouterArgs>>

export type FilterFunction<
  TFilter extends RouterFilterMap<unknown, unknown>
> = (...args) => OutboundRouterFilterReturn<FilterMapReturn<TFilter>>

export type PreprocessedFilters<
  TFilter extends RouterFilterMap<unknown, unknown>
> = [string, FilterFunction<FilterMapReturn<TFilter>>][]

export type FilterMapReturn<
  TFilter extends RouterFilterMap<unknown, unknown>
> = TFilter extends RouterFilterMap<unknown, infer A> ? A : never

export type FilterMapRouterArgs<TReturn> = TReturn extends Record<
  string,
  unknown
>
  ? TReturn
  : never
