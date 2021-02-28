const NestLifecycleFunctions = [
  'constructor',
  'onModuleInit',
  'onApplicationBootstrap',
  'onModuleDestroy',
  'onApplicationShutdown',
]

// eslint-disable-next-line @typescript-eslint/ban-types
export function getFunctionValues<T extends object>(x: T): T {
  const proto = Object.getPrototypeOf(x)
  return Object.fromEntries(
    Reflect.ownKeys(proto)
      .filter(
        key =>
          !NestLifecycleFunctions.includes(String(key)) &&
          typeof Reflect.get(x, key) === 'function',
      )
      .map(key => {
        return [key, x[key].bind(x)]
      }),
  ) as T
}
