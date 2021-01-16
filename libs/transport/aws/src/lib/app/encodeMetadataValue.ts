export function encodeMetadataValue(s: string) {
  return s.replace(/"/g, '±')
}
