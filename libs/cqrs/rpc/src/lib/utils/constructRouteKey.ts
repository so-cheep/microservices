import { RouteKey } from '../types'

export function constructRouteKey(args: string[]): string
export function constructRouteKey(args: RouteKey): string
export function constructRouteKey(args: RouteKey | string[]): string {
  if (Array.isArray(args)) {
    return args.join('.')
  }
  return [args.busType, args.moduleName]
    .concat(
      Array.isArray(args.functionName)
        ? args.functionName
        : [args.functionName],
    )
    .join('.')
}
