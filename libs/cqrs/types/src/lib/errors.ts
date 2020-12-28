import { PublishProps } from './transport'

export class RpcTimeoutError extends Error {
  public readonly code = 'RPC_TIMEOUT_ERROR'
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly originalPublishArgs: PublishProps<any, unknown>,
  ) {
    super(`RPC Timeout for [${originalPublishArgs.route}]`)
  }
}

export class InvalidRpcPathError extends Error {
  public readonly code = 'INVALID_RPC_PATH'
  constructor(public readonly path: Array<string>) {
    super(`Invalid RPC Client path [${path.join('.')}]`)
  }
}
