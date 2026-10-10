import { buildMonthToDatePeriods } from './reportingPeriod.js'
import { matchesChannelType } from './channelTypes.js'

export function dateRange(start, end) {
  const result = []
  const date = new Date(`${start}T00:00:00Z`)
  while (date.toISOString().slice(0, 10) <= end) {
    result.push(date.toISOString().slice(0, 10))
    date.setUTCDate(date.getUTCDate() + 1)
  }
  return result
}

export function weekStart(statDate) {
  const date = new Date(`${statDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
  return date.toISOString().slice(0, 10)
}

export function mean(series) {
  return series.length && series.every(item => item.value !== null)
    ? series.reduce((sum, item) => sum + item.value, 0) / series.length
    : null
}

export function compareCapacity(current, baseline) {
  if (![current, baseline].every(value => typeof value === 'number' && Number.isFinite(value))) return null
  const difference = current - baseline
  return { difference, percent: baseline === 0 ? (difference === 0 ? 0 : null) : difference / baseline * 100 }
}

function progress(production, targets, gridIds, field, statDate) {
  const hasTarget = gridIds.length > 0 && gridIds.every(id => {
    const records = targets.filter(item => item.gridId === id)
    return records.length === 1 && typeof records[0][field] === 'number' && Number.isFinite(records[0][field]) && records[0][field] >= 0
      && (field !== 'dailyTarget' || records[0].targetDate === statDate)
  })
  const target = hasTarget ? targets.reduce((sum, item) => sum + item[field], 0) : null
  return { production, target, hasTarget, gap: hasTarget && production !== null ? Math.max(0, target - production) : null,
    completionRate: hasTarget && target > 0 && production !== null ? Math.round(production / target * 100) : null }
}

export function buildCapacityMetric(dashboard, productId, gridIds, channelType = '', scope = null) {
  const ids = new Set(gridIds)
  const matches = row => row.productId === productId && ids.has(row.gridId) && matchesChannelType(row, channelType)
  const rows = dashboard.rows.filter(matches)
  const targets = dashboard.targets.filter(item => item.productId === productId && ids.has(item.gridId) && (channelType ? matchesChannelType(item, channelType) : !item.channelType))
  if (dashboard.regionRows) {
    // Regional summaries are authoritative and must not be mixed with staff/channel records.
    const source = channelType ? (dashboard.periodRows || []).filter(matches) : dashboard.regionRows.filter(row => row.productId === productId &&
      (scope ? row.level === scope.level && (scope.level === 'city' || (scope.level === 'branch' ? row.branchId === scope.id : row.gridId === scope.id)) : row.level === 'grid' && ids.has(row.gridId)))
    const sum = period => {
      const selected = source.filter(row => row.period === period)
      if (!selected.length || selected.some(row => typeof row.production !== 'number' || !Number.isFinite(row.production))) return null
      if (!scope || channelType) {
        if (gridIds.some(id => !selected.some(row => row.gridId === id))) return null
      } else if (selected.length !== 1) return null
      return selected.reduce((total, row) => total + row.production, 0)
    }
    const monthly = progress(sum('mon'), targets, gridIds, 'target', dashboard.statDate)
    const daily = progress(sum('day'), targets, gridIds, 'dailyTarget', dashboard.statDate)
    const periods = buildMonthToDatePeriods(dashboard.statDate)
    const days = dateRange(periods.current.startDate, periods.current.endDate).length
    const previousDays = dateRange(periods.previous.startDate, periods.previous.endDate).length
    const previous = sum('last_mon'), week = sum('week')
    return { ...monthly, daily, weekSeries: [], monthSeries: [], previousSeries: [],
      weeklyAverage: week === null ? null : week / 7,
      monthAverage: monthly.production === null ? null : monthly.production / days,
      previousAverage: previous === null ? null : previous / previousDays, weekBasis: 'rolling7' }
  }
  const monthly = progress(rows.reduce((sum, row) => sum + Number(row.production || 0), 0), targets, gridIds, 'target', dashboard.statDate)
  if (!dashboard.statDate) return { ...monthly, daily: progress(null, [], gridIds, 'dailyTarget', ''), weekSeries: [], monthSeries: [], previousSeries: [], weeklyAverage: null, monthAverage: null, previousAverage: null }

  const periods = buildMonthToDatePeriods(dashboard.statDate)
  const daily = new Map()
  for (const row of (dashboard.dailyRows || []).filter(matches)) {
    const entry = daily.get(row.date) || { total: 0, grids: new Set() }
    if (typeof row.production !== 'number' || !Number.isFinite(row.production)) continue
    entry.total += row.production
    entry.grids.add(row.gridId)
    daily.set(row.date, entry)
  }
  const series = (start, end) => dateRange(start, end).map(date => {
    const entry = daily.get(date)
    return { date, value: entry && gridIds.every(id => entry.grids.has(id)) ? entry.total : null }
  })
  const weekSeries = series(weekStart(dashboard.statDate), dashboard.statDate)
  const monthSeries = series(periods.current.startDate, dashboard.statDate)
  const previousSeries = series(periods.previous.startDate, periods.previous.endDate)
  return { ...monthly, daily: progress(weekSeries.at(-1)?.value ?? null, targets, gridIds, 'dailyTarget', dashboard.statDate),
    weekSeries, monthSeries, previousSeries, weeklyAverage: mean(weekSeries), monthAverage: mean(monthSeries), previousAverage: mean(previousSeries) }
}
