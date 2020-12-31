import Flatted = require('flatted')

export function encodeRpc(...args: unknown[]) {
  // TODO: support injecting constructor/inheritance metadata?
  return Flatted.stringify(args)
}
