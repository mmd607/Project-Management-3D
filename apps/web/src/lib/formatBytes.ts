/** Human-readable byte size, e.g. 1536 -> "1.5 KB". Real scanned size only — see
 * docs/DATA_AND_SCORING.md for what "scanned size" does and doesn't include. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded} ${units[unitIndex]}`;
}
