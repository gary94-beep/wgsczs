import { buildMonthToDatePeriods } from './reportingPeriod.js'
import { matchesChannelType } from './channelTypes.js'
import { targetValue, targetProgress, monthlyDailyTarget } from './targetValues.js'

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

function progress(production, targets, gridIds, field, statDate, scope) {
  const period = field === 'dailyTarget' ? 'day' : 'month'
  
  const sum = kind => {
    // 1. 优先匹配汇总层级目标（全市 / 分公司）
    if (scope && ['city', 'branch'].includes(scope.level)) {
      let summaryId = '';
      if (scope.level === 'city') summaryId = '全市::全市';
      else if (scope.level === 'branch' && scope.id) summaryId = `${scope.id}::${scope.id}`;
      
      if (summaryId) {
        const summaryRecords = targets.filter(item => item.gridId === summaryId);
        if (summaryRecords.length === 1) {
          const row = summaryRecords[0];
          const month = row.targetMonth ?? row.target_month;
          if (month && month !== statDate.slice(0, 7)) return null;
          
          const value = period === 'day' ? monthlyDailyTarget(row, statDate, kind) : targetValue(row, period, kind);
          if (value !== null) return value;
        }
      }
    }

    // 2. 如果没有汇总目标，兜底：把旗下网格的目标加起来
    if (!gridIds.length) return null
    let total = 0
    for (const id of gridIds) {
      const records = targets.filter(item => item.gridId === id)
      if (records.length !== 1) return null
      const row = records[0], month = row.targetMonth ?? row.target_month
      if (month && month !== statDate.slice(0, 7)) return null
      const value = period === 'day' ? monthlyDailyTarget(row, statDate, kind) : targetValue(row, period, kind)
      if (value === null) return null
      const base = period === 'day' ? monthlyDailyTarget(row, statDate) : targetValue(row, period)
      if (kind === 'challenge' && base !== null && value < base) return null
      total += value
    }
    return total
  }
  return targetProgress(production, sum('base'), sum('challenge'), sum('min'))
}

export function buildCapacityMetric(dashboard, productId, gridIds, channelType = '', scope = null) {
  const ids = new Set(gridIds)
  const matches = row => row.productId === productId && ids.has(row.gridId) && matchesChannelType(row, channelType)
  const rows = dashboard.rows.filter(matches)
  
  // 过滤 targets 时，除了匹配当前网格，还要把当前范围的汇总节点（全市::全市 / 分公司::分公司）也放进来
  const summaryId = scope?.level === 'city' ? '全市::全市' : (scope?.level === 'branch' && scope.id ? `${scope.id}::${scope.id}` : null);
  const targets = dashboard.targets.filter(item => 
    item.productId === productId && 
    (ids.has(item.gridId) || item.gridId === summaryId) && 
    (channelType ? matchesChannelType(item, channelType) : !item.channelType)
  )

  if (dashboard.regionRows) {
    // Regional summaries are authoritative and must not be mixed with staff/channel records.
    const source = channelType ? (dashboard.periodRows || []).filter(matches) : dashboard.regionRows.filter(row => row.productId === productId &&
      (scope ? row.level === scope.level && (scope.level === 'city' || (scope.level === 'branch' ? row.branchId === scope.id : row.gridId === scope.id)) : row.level === 'grid' && ids.has(row.gridId)))
    const sum = period => {
      const selected = source.filter(row => row.period === period)
      if (!selected.length || selected.some(row => typeof row.production !== 'number' || !Number.isFinite(row.production))) return null
      if (!channelType) {
        if (!scope && gridIds.some(id => !selected.some(row => row.gridId === id))) return null
        if (scope && selected.length !== 1) return null
      }
      return selected.reduce((total, row) => total + row.production, 0)
    }
    const covered = period => [...new Set(source.filter(row => row.period === period && typeof row.production === 'number' && Number.isFinite(row.production)).map(row => row.gridId))].sort()
    const coverage = period => ({ coveredGridCount: covered(period).length, selectedGridCount: ids.size,
      partial: covered(period).length > 0 && covered(period).length < ids.size })
    const sameCoverage = (a, b) => !channelType || JSON.stringify(covered(a)) === JSON.stringify(covered(b))
    
    const monthly = progress(sum('mon'), targets, gridIds, 'target', dashboard.statDate, scope)
    const daily = progress(sum('day'), targets, gridIds, 'dailyTarget', dashboard.statDate, scope)
    if (channelType) {
      monthly.dataCoverage = coverage('mon')
      daily.dataCoverage = coverage('day')
    }
    
    const periods = buildMonthToDatePeriods(dashboard.statDate)
    const days = dateRange(periods.current.startDate, periods.current.endDate).length
    const previousDays = dateRange(periods.previous.startDate, periods.previous.endDate).length
    const previous = sum('last_mon'), week = sum('week')
    
    return { 
      ...monthly, 
      daily, 
      weekSeries: [], 
      monthSeries: [], 
      previousSeries: [],
      weeklyAverage: week === null || !sameCoverage('day', 'week') ? null : week / 7,
      monthAverage: monthly.production === null ? null : monthly.production / days,
      previousAverage: previous === null || !sameCoverage('mon', 'last_mon') ? null : previous / previousDays,
      weekBasis: 'rolling7' 
    }
  }
  
  const monthly = progress(rows.reduce((sum, row) => sum + Number(row.production || 0), 0), targets, gridIds, 'target', dashboard.statDate, scope)
  if (!dashboard.statDate) {
    return { 
      ...monthly, 
      daily: progress(null, [], gridIds, 'dailyTarget', '', scope), 
      weekSeries: [], 
      monthSeries: [], 
      previousSeries: [], 
      weeklyAverage: null, 
      monthAverage: null, 
      previousAverage: null 
    }
  }

  const periods = buildMonthToDatePeriods(dashboard.statDate)
  const dailyMap = new Map()
  for (const row of (dashboard.dailyRows || []).filter(matches)) {
    const entry = dailyMap.get(row.date) || { total: 0, grids: new Set() }
    if (typeof row.production !== 'number' || !Number.isFinite(row.production)) continue
    entry.total += row.production
    entry.grids.add(row.gridId)
    dailyMap.set(row.date, entry)
  }
  
  const series = (start, end) => dateRange(start, end).map(date => {
    const entry = dailyMap.get(date)
    return { date, value: entry && gridIds.every(id => entry.grids.has(id)) ? entry.total : null }
  })
  
  const weekSeries = series(weekStart(dashboard.statDate), dashboard.statDate)
  const monthSeries = series(periods.current.startDate, dashboard.statDate)
  const previousSeries = series(periods.previous.startDate, periods.previous.endDate)
  
  return { 
    ...monthly, 
    daily: progress(weekSeries.at(-1)?.value ?? null, targets, gridIds, 'dailyTarget', dashboard.statDate, scope),
    weekSeries, 
    monthSeries, 
    previousSeries, 
    weeklyAverage: mean(weekSeries), 
    monthAverage: mean(monthSeries), 
    previousAverage: mean(previousSeries) 
  }
}
