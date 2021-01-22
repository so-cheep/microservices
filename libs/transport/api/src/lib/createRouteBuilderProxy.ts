export function createRouteBuilderProxy(
  joinSymbol: string,
  path: string[] = [],
): any {
  return new Proxy(() => undefined, {
    get: (_, prop) => {
      return createRouteBuilderProxy(joinSymbol, [
        ...path,
        String(prop),
      ])
    },
    apply: () => path.join(joinSymbol),
  })
}
