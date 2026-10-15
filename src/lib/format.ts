const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

/**
 * `Intl` with `style: 'unit', unit: 'byte'` renders "3,297,280 byte" — it has
 * no short form for a counted unit. File sizes are what this app is about, so
 * they get a real formatter.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${Math.max(0, bytes)} B`

  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }

  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${UNITS[unit]}`
}