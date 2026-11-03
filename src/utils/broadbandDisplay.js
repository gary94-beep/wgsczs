// Handle2 may serialize unavailable numeric fields as empty or text values.
export function finiteValue(value) {
  if (value == null || typeof value === 'boolean' || (typeof value !== 'number' && typeof value !== 'string')) return null
  if (typeof value === 'string' && !value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
export function percent(value) {
  const number = finiteValue(value)
  return number === null ? '—' : `${number.toLocaleString('zh-CN', {maximumFractionDigits: 1})}%`
}
export function fill(value) {
  const number = finiteValue(value)
  return `${number === null ? 0 : Math.min(100, Math.max(0, number))}%`
}
export function tone(stats, timeProgress) {
  const rate = finiteValue(stats?.completionRate)
  const progress = finiteValue(timeProgress)
  return rate === null || progress === null ? 'bb-tone-unknown' : rate + 1e-9 >= progress ? 'bb-tone-reached' : 'bb-tone-behind'
}
