import { dateRange } from '../utils/capacityMetrics.js'
import { buildMonthToDatePeriods } from '../utils/reportingPeriod.js'

// Demo history is allocated deterministically and reconciles to each monthly total.
function allocate(total, dates, seed) {
  const weights = dates.map((_, index) => 2 + (index * 3 + seed * 7) % 9)
  const denominator = weights.reduce((sum, value) => sum + value, 0)
  let cumulative = 0
  let allocated = 0
  return dates.map((date, index) => {
    cumulative += weights[index]
    const next = Math.round(total * cumulative / denominator)
    const production = next - allocated
    allocated = next
    return { date, production }
  })
}

export function buildMockDailyRows(rows, statDate) {
  const periods = buildMonthToDatePeriods(statDate)
  const previousEnd = new Date(`${periods.current.startDate}T00:00:00Z`)
  previousEnd.setUTCDate(0)
  const currentDates = dateRange(periods.current.startDate, statDate)
  const previousDates = dateRange(periods.previous.startDate, previousEnd.toISOString().slice(0, 10))
  return rows.flatMap(row => {
    const seed = [...`${row.gridId}|${row.staffId}|${row.productId}`].reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const current = allocate(row.production, currentDates, seed)
    const previousTotal = Math.round(row.production * previousDates.length / currentDates.length * (0.8 + seed % 5 * 0.08))
    const previous = allocate(previousTotal, previousDates, seed + 2)
    return [...previous, ...current].map(value => ({ ...row, ...value }))
  })
}
