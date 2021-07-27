import { cheepJson } from '../cheepJson'
import * as flatted from 'flatted'
describe('cheep json using default json', () => {
  const json = cheepJson()

  it('encodes and decodes dates successfully', () => {
    const myDate = new Date()
    const withDate = { myDate }
    const encoded = json.stringify(withDate)

    expect(encoded).toMatch(
      `{"myDate":{"#DATE":"${myDate.toISOString()}"}}`,
    )

    const decoded = json.parse(encoded)
    expect(decoded).toMatchObject(withDate)
  })
})

describe('cheep json using flatted json', () => {
  const json = cheepJson(flatted)

  it('encodes and decodes dates successfully', () => {
    const myDate = new Date()
    const withDate = { myDate }
    const encoded = json.stringify(withDate)

    expect(encoded).toMatch(/"#DATE":/)
    expect(encoded).toMatch(RegExp(myDate.toISOString()))

    const decoded = json.parse(encoded)
    expect(decoded).toMatchObject(withDate)
  })
})
