import { getLeafAddresses } from '../getLeafAddresses'

describe('get leaf addresses', () => {
  it('should work on a 1 deep object', () => {
    const obj = {
      A: 1,
      B: 2,
      C: 3,
    }

    const results = getLeafAddresses(obj)

    expect(results).toContainEqual([['A'], 1])
    expect(results).toContainEqual([['B'], 2])
    expect(results).toContainEqual([['C'], 3])
  })

  it('should work on a variably deep object', () => {
    const obj = {
      A: 1,
      B: { BB: { BBB: 'thing' } },
      C: { CA: 'A', CB: 'B' },
    }

    const results = getLeafAddresses(obj)

    expect(results).toContainEqual([['A'], 1])
    expect(results).toContainEqual([['B', 'BB', 'BBB'], 'thing'])
    expect(results).toContainEqual([['C', 'CA'], 'A'])
    expect(results).toContainEqual([['C', 'CB'], 'B'])
  })

  it('should work on an array?', () => {
    const obj = {
      A: 1,
      B: [{ BB: 'Q' }],
    }

    const results = getLeafAddresses(obj)

    expect(results).toContainEqual([['A'], 1])
    expect(results).toContainEqual([['B', '0', 'BB'], 'Q'])
  })
})
