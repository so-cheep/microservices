import { TransportCompactMessage } from '@cheep/transport'
import { BROADCAST } from '../constants'
import { preprocessFilterMap } from '../preprocessFilterMap'
import { routeFilter } from '../routeFilter'
import { filterTestMap } from './mockData'

describe('route filter', () => {
  let filters: ReturnType<typeof preprocessFilterMap>
  beforeEach(() => {
    filters = preprocessFilterMap({ filterMap: filterTestMap })
  })

  it('returns undefined when filter returns false', () => {
    const item = <TransportCompactMessage<unknown>>{
      metadata: {},
      payload: {},
      route: 'Abs.false',
    }

    const result = routeFilter({ filters, item })
    expect(result).toBeUndefined()
  })

  it('returns undefined when no filter is found to match', () => {
    const item = <TransportCompactMessage<unknown>>{
      metadata: {},
      payload: {},
      route: 'Not.a.match',
    }

    // remove the top level wildcard filter
    const withoutWildcard = filters.filter(([route]) => route !== '')
    const result = routeFilter({
      filters: withoutWildcard,
      item,
    })

    expect(result).toBeUndefined()
  })

  it('returns an object with isBroadcast set to true when filter returns broadcast', () => {
    const item = <TransportCompactMessage<unknown>>{
      metadata: {},
      payload: {},
      route: 'Abs.broadcast',
    }

    const result = routeFilter({ filters, item })
    expect(result).not.toBeUndefined()
    expect(result.isBroadcast).toBeTruthy()
  })

  it('returns an object with isBroadcast set to false when filter does not return broadcast', () => {
    const item = <TransportCompactMessage<unknown>>{
      metadata: {},
      payload: {},
      route: 'Abs.meta',
    }

    const result = routeFilter({ filters, item })
    expect(result).not.toBeUndefined()
    expect(result.isBroadcast).toBeFalsy()
  })

  it('returns an object with the filter return value merged in metadata', () => {
    const existingMetadata = { existing: 123 }
    const item = <TransportCompactMessage<unknown>>{
      metadata: existingMetadata,
      payload: {},
      route: 'Abs.meta',
    }

    const filterReturn = (filters.find(
      ([path]) => path === 'Abs.meta',
    )[1]() as unknown) as Record<string, string>
    const result = routeFilter({ filters, item })
    expect(result).not.toBeUndefined()
    expect(result.metadata).toMatchObject(
      expect.objectContaining({
        ...filterReturn,
        ...existingMetadata,
      }),
    )
  })

  it('returns an object with the existing metadata if the filter simply returns true', () => {
    const existingMetadata = { existing: 123 }
    const item = <TransportCompactMessage<unknown>>{
      metadata: existingMetadata,
      payload: {},
      route: 'Abs.true',
    }

    const result = routeFilter({ filters, item })
    expect(result).not.toBeUndefined()
    expect(result.metadata).toMatchObject(
      expect.objectContaining({
        ...existingMetadata,
      }),
    )
  })

  it('matches a wildcard filter at the top level', () => {
    const item = <TransportCompactMessage<unknown>>{
      metadata: {},
      payload: {},
      route: 'Top.level.wildcard',
    }

    const result = routeFilter({ filters, item })
    expect(result).toBeUndefined()

    // make the top level wildcard a broadcast, just to be sure we're being affected by it
    const topWildcard = filters.find(([route]) => route === '')
    topWildcard[1] = () => BROADCAST

    const result2 = routeFilter({ filters, item })
    expect(result2).not.toBeUndefined()
    expect(result2.isBroadcast).toBeTruthy()
  })

  it('matches a wildcard filter at the same level as other filters', () => {
    const item = <TransportCompactMessage<unknown>>{
      metadata: {},
      payload: {},
      route: 'Abs.wildcard',
    }

    const result = routeFilter({ filters, item })
    expect(result).not.toBeUndefined()

    // make the top level wildcard a broadcast, just to be sure we're being affected by it
    const topWildcard = filters.find(([route]) => route === 'Abs.')
    topWildcard[1] = () => BROADCAST

    const result2 = routeFilter({ filters, item })
    expect(result2).not.toBeUndefined()
    expect(result2.isBroadcast).toBeTruthy()
  })

  it('matches a wildcard filter with a path which is deeper than provided filters', () => {
    const item = <TransportCompactMessage<unknown>>{
      metadata: {},
      payload: {},
      route: 'Short.But.Much.Deeper.Than.Other.Filters.path',
    }

    const result = routeFilter({ filters, item })
    expect(result).toBeUndefined()

    // make the top level wildcard a broadcast, just to be sure we're being affected by it
    const topWildcard = filters.find(
      ([route]) => route === 'Short.But.Much.Deeper.',
    )
    topWildcard[1] = () => BROADCAST

    const result2 = routeFilter({ filters, item })
    expect(result2).not.toBeUndefined()
    expect(result2.isBroadcast).toBeTruthy()
  })
})
