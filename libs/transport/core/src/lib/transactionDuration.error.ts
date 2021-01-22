export class TransactionDurationError extends Error {
  public readonly code = 'TRANSACTION_DURATION_ERROR'
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly transactionId: string,
    public readonly transactionDuration: number,
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
