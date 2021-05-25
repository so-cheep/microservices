import { getLeafAddresses } from '@cheep/utils'
import { RouterFilterMap, FilterMapReturn } from './types'
import { FilterFunction, PreprocessedFilters } from './types'

/**
 * preprocess a filter map to make it faster to look up filters
 * @returns an array of route prefix + filter tuples, sorted by route prefix depth (most segments first)
 */
export function preprocessFilterMap<
  TFilter extends RouterFilterMap<any, unknown> = RouterFilterMap<
    any,
    unknown
  >
>(args: {
  filterMap?: TFilter | undefined
  joinPrefix?: string
}): PreprocessedFilters<TFilter> {
  if (!args.filterMap) {
    return [['', () => true]]
  }
  const joinPrefix = args.joinPrefix ?? '.'
  return (
    getLeafAddresses<FilterFunction<FilterMapReturn<TFilter>>>(
      args.filterMap,
    )
      // remove any paths that have a falsy leaf
      .filter(([_, leaf]) => !!leaf)
      // sort by length of last key first, then # path segments
      // to ensure we find the longest match first, but leave the wildcard match last
      .sort(
        ([a], [b]) => b[b.length - 1].length - a[a.length - 1].length,
      )
      .sort(([a], [b]) => b.length - a.length)
      // stringify the remaining leaves, and ensure the return is a function
      .map<[string, FilterFunction<FilterMapReturn<TFilter>>]>(
        ([path, leaf]) => [path.join(joinPrefix), leaf],
      )
  )
}
