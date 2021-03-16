import { RouteVariableOperator } from './types'

export function createRouteBuilderProxy(
  joinSymbol: string,
  path: (string | string[])[] = [],
): any {
  return new Proxy(() => undefined, {
    get: (_, prop) => {
      return createRouteBuilderProxy(joinSymbol, [
        ...path,
        String(prop),
      ])
    },
    apply: (_, __, args) => {
      const lastPathItem = path[path.length - 1]
      if (lastPathItem === RouteVariableOperator) {
        return createRouteBuilderProxy(joinSymbol, [
          ...path.slice(0, -1),
          ...args.filter(
            a =>
              (Array.isArray(a) &&
                a.every(x => typeof x === 'string')) ||
              typeof a === 'string',
          ),
        ])
      }

      // TODO: support tuples in the middle of the array
      return path.join(joinSymbol)
    },
  })
}
