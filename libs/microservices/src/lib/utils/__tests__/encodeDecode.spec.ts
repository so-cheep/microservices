import * as faker from 'faker'
import { encodeRpc } from '../encodeRpc'
import { decodeRpc } from '../decodeRpc'

describe('encode and decode work together', () => {
  it('works with one arg', () => {
    const input = { id: faker.random.uuid() }
    const encoded = encodeRpc(input)
    const result = decodeRpc<typeof input>(encoded)

    expect(input).toMatchObject(result)
  })
})
