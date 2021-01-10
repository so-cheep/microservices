export class RemoteError extends Error {
  public readonly code = 'REMOTE_ERROR'

  constructor(
    public readonly message: string,
    public readonly callStack: string,
    public readonly className: string,
  ) {
    super(message)
  }
}
