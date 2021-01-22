import { MessageMetadata, Transport } from '@cheep/transport'

interface Options {
  joinSymbol: string
  executablePrefixes?: string[]
  referrer?: {
    route: string
    metadata: MessageMetadata
  }
}

export function recursiveApiCaller(
  transport: Transport,
  options: Options,
  /** only needed internally, **DO NOT SET** */
  path: string[] = [],
): () => void {
  // make array safe
  return new Proxy(() => undefined, {
    get: (_, propertyName) => {
      return recursiveApiCaller(
        transport,
        options,
        path.concat([String(propertyName)]),
      )
    },

    apply: (_, __: any, args: unknown[]) => {
      if (!path.length) {
        return
      }

      const {
        joinSymbol,
        executablePrefixes = [],
        referrer,
      } = options

      const route = path.join(joinSymbol)

      const isExecutable = executablePrefixes.some(prefix =>
        route.startsWith(prefix + joinSymbol),
      )

      const [message, metadata] = args

      if (isExecutable) {
        return transport.execute({
          route,
          message,
          metadata: <any>metadata,
          referrer,
        })
      }

      return transport.publish({
        route,
        message,
        metadata: <any>metadata,
        referrer,
      })
    },
  })
}
