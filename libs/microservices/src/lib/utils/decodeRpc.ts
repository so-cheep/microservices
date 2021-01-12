import * as Flatted from 'flatted'

export function decodeRpc<T extends unknown>(encoded: string): T {
  // TODO: support injecting constructor/inheritance metadata?
  return Flatted.parse(encoded)
}
