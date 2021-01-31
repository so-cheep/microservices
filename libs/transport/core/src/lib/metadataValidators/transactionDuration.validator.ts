import { TransactionMetadata } from '../metadataReducers/transaction.reducer'
import { TransactionDurationError } from '../transactionDuration.error'
import { MetadataValidator, ValidatorMessage } from '../transport'

export function transactionDurationValidator(
  maxDuration: number,
  parseDate: (x: string) => number,
  dateNow: () => number | string,
): MetadataValidator<TransactionMetadata> {
  return (msg: ValidatorMessage<TransactionMetadata>) => {
    const transactionStartedAt = msg.metadata.transactionStartedAt

    const start =
      typeof transactionStartedAt === 'number'
        ? transactionStartedAt
        : parseDate(transactionStartedAt)

    const now = dateNow()
    const end = typeof now === 'number' ? now : parseDate(now)
    const duration = end - start
    if (!(start && end && duration <= maxDuration)) {
      const transactionId = <string>msg.metadata.transactionId

      throw new TransactionDurationError(
        transactionId,
        duration,
        msg.route,
        <string[]>msg.metadata['callStack'] ?? [],
      )
    }
  }
}
