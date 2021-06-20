import {
  MessageMetadata,
  TransportCompactMessage,
} from '@cheep/transport/core2'
import { DeepPartial } from '@cheep/utils'
import { BROADCAST } from './constants'
import { FilterMapReturn, PreprocessedFilters } from './types'

/**
 * applies a set of preprocessed route filters to determine if the transport item should be passed through the router
 * @returns either undefined (DROP ITEM) or object with `isBroadcast` flag and updated metadata object
 */
export function routeFilter<
  TFilterMap,
  TFilterReturn = FilterMapReturn<TFilterMap>
>(args: {
  filters: PreprocessedFilters<TFilterMap>
  item: TransportCompactMessage<unknown>
}):
  | {
      isBroadcast: boolean
      metadata: MessageMetadata & DeepPartial<TFilterReturn>
    }
  | undefined {
  const { filters, item } = args
  // check to see if we match any filters
  // it is KEY that we find the longest match first, so `filterPrefixes` must be sorted by length
  const routeFilter = filters.find(([p]) => item.route.startsWith(p))

  if (!routeFilter) {
    // no filter found, return undefined
    return
  }

  // TODO: make the item arg a deep copy or freeze it before passing to route filter
  const result = routeFilter[1](item)

  if (!result) {
    // result was false, return undefined
    return
  }

  return {
    isBroadcast: result === BROADCAST,
    metadata:
      typeof result === 'object'
        ? { ...item.metadata, ...(result as TFilterReturn) }
        : (item.metadata as MessageMetadata &
            DeepPartial<TFilterReturn>),
  }
}
