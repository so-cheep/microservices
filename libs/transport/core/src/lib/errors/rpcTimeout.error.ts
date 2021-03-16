import { PublishProps } from '../transport'

export class RpcTimeoutError extends Error {
  public readonly code = 'RPC_TIMEOUT_ERROR'
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly originalPublishArgs: PublishProps<any>,
  ) {
    super(`RPC Timeout for [${originalPublishArgs.route}]`)
  }
}
