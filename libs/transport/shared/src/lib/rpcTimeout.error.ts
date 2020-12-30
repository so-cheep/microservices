import { IPublishProps } from './transport'

export class RpcTimeoutError extends Error {
  public readonly code = 'RPC_TIMEOUT_ERROR'
  constructor(
    public readonly originalPublishArgs: IPublishProps<
      never,
      unknown
    >,
  ) {
    super(`RPC Timeout for [${originalPublishArgs.route}]`)
  }
}
