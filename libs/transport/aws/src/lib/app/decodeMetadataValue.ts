export function decodeMetadataValue(s) {
  if (!s) {
    return s
  }

  return s.replace(/±/g, '"')
}
