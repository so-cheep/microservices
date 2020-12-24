import { IRouteKey } from '../types'

export function constructRouteKey(args: IRouteKey): string {
  return `${args.busType}.${
    Array.isArray(args.functionName)
      ? args.functionName.join('.')
      : args.functionName
  }`
}
