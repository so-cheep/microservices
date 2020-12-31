export class InvalidRpcPathError extends Error {
  public readonly code = 'INVALID_RPC_PATH_ERROR'
  constructor(public readonly path: string[]) {
    super(`Invalid RPC Path: [${path.join('.')}]`)
  }
}
