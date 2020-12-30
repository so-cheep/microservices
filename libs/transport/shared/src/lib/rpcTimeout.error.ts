import { PublishProps } from './transport'

export class RpcTimeoutError extends Error {
  public readonly code = 'RPC_TIMEOUT_ERROR'
  constructor(
    public readonly originalPublishArgs: PublishProps<never, unknown>,
  ) {
    super(`RPC Timeout for [${originalPublishArgs.route}]`)
  }
}
