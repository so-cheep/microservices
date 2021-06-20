export function normalizeError(err: Error): NormalizedError {
  return {
    errorMessage: err.message,
    errorCallStack: err.stack,
    errorClassName: err.constructor.name,
  }
}

export interface NormalizedError {
  errorMessage: string
  errorCallStack: string
  errorClassName: string
}
