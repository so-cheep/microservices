export class HandlerRegistrationError extends Error {
  public readonly code = 'HANDLER_REGISTRATION_ERROR'
  constructor(
    public readonly injectionToken: unknown,
    public readonly functionName: string,
    public readonly innerError?: unknown,
  ) {
    super(
      `There was an error handling [${
        injectionToken['name'] ?? injectionToken.toString()
      }.${functionName}]: ${innerError}`,
    )
  }
}
