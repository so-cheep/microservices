import { preprocessFilterMap } from '../preprocessFilterMap'
import { filterTestMap } from './mockData'

describe('preprocessFilterMap', () => {
  const processed = preprocessFilterMap({ filterMap: filterTestMap })

  it('should generate a list of route+filter fn tuples, sorted by route specificity', () => {
    expect(processed).toHaveLength(9)
  })

  it('should put wildcards after more specific filters', () => {
    const pathsOnly = processed.map(p => p[0])
    expect(pathsOnly[0]).not.toMatch('Abs.')
    const last = pathsOnly[pathsOnly.length - 1]
    expect(last).toMatch('')

    // check that the nested wildcard is after the more precise option
    expect(
      pathsOnly.indexOf('Short.But.Much.Deeper.'),
    ).toBeGreaterThan(pathsOnly.indexOf('Short.But.Much.Deeper.path'))

    // ensure wildcards are sorted by depth specificity
    expect(pathsOnly.indexOf('Abs.')).toBeGreaterThan(
      pathsOnly.indexOf('Short.But.Much.Deeper.'),
    )
  })

  it('should sort filters by descending specificity', () => {
    for (const item of processed) {
      const idx = processed.indexOf(item)
      expect(item[1]).toBeInstanceOf(Function)
      if (idx > 0) {
        const currentSegments = item[0].split('.')
        const prevRoute = processed[idx - 1][0]
        const prevSegments = prevRoute.split('.')
        expect(prevSegments.length).toBeGreaterThanOrEqual(
          currentSegments.length,
        )
      }
    }
  })

  it('should return a single wildcard when no filters are passed', () => {
    const filters = preprocessFilterMap({ filterMap: undefined })

    expect(filters).toHaveLength(1)
    expect(filters[0][1]()).toBeTruthy()
  })
})
