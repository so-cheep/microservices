export function buildMessage(
  payload: unknown,
  metadata: MessageMetadata,
  error?: ErrorData,
) {
  return {
    payload,
  }
}
