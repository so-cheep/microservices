export class RecursionCallError extends Error {
  public readonly code = 'RECURSION_CALL_ERROR'
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly transactionId: string,
    public readonly route: string,
    public readonly callStack: string[],
  ) {
    super(
      `Recursion call [${transactionId}, ${callStack
        .concat([route])
        .join(' -> ')}]`,
    )
  }
}
