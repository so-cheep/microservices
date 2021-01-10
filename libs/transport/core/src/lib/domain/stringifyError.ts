export function stringifyError(err: Error): StringifiedError {
  return {
    errorMessage: err.message,
    errorCallStack: err.stack,
    errorClassName: err.name,
  }
}

export interface StringifiedError {
  errorMessage: string
  errorCallStack: string
  errorClassName: string
}
