export class FailedMessageError extends Error {
  constructor(
    public innerError: Error,
    public fullFailedMessage: string,
  ) {
    super(innerError.message)
  }
}
