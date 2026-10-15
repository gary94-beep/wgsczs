import { buildMonthToDatePeriods } from './reportingPeriod.js'
import { normalizeChannelType } from './channelTypes.js'

export function buildChangeAlerts(data, params) {
  const allowed = new Set(data.organization.grids.map(r => r.gridId))
  if (!Array.isArray(params.gridIds || []) || (params.gridIds || []).some(id => !allowed.has(id))) throw new Error('无权访问该网格')
  const ids = new Set(params.gridIds?.length ? params.gridIds : allowed)
  const rate = params.declineRate ?? 30, value = params.declineValue ?? 5
  if (rate === '' || value === '' || !Number.isFinite(Number(rate)) || Number(rate) < 0 || Number(rate) > 100 || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error('异动阈值无效')
  if (!data.products.some(r => r.productId === params.productId)) throw new Error('产品无效')
  const dates = buildMonthToDatePeriods(data.statDate)
  const days = Number(dates.current.endDate.slice(-2)), previousDays = Number(dates.previous.endDate.slice(-2))
  const groups = new Map()
  const add = (row, previous) => {
    if (!ids.has(row.gridId) || row.productId !== params.productId || (params.channel && row.channel !== params.channel)) return
    const type = normalizeChannelType(row.channelType)
    const identity = type === '直销队伍' ? row.staffId : row.channelCode || JSON.stringify([row.serviceProvider, row.microChannelName || row.channel])
    if (!identity || !['直销队伍', '三星+渠道', '末梢渠道'].includes(type)) return
    const key = JSON.stringify([row.gridId, type, identity])
    const entry = groups.get(key) || { ...row, channelType: type, current: null, previous: null, invalid: false }
    if (typeof row.production !== 'number' || !Number.isFinite(row.production) || row.production < 0) entry.invalid = true
    else { const field = previous ? 'previous' : 'current'; entry[field] = (entry[field] ?? 0) + row.production }
    groups.set(key, entry)
  }
  if (data.periodRows) {
    for (const row of data.periodRows) if (row.period === 'mon' || row.period === 'last_mon') add(row, row.period === 'last_mon')
  } else {
    for (const row of data.rows) add(row, false)
    for (const row of data.dailyRows || []) if (row.date >= dates.previous.startDate && row.date <= dates.previous.endDate) add(row, true)
  }
  const results = []
  for (const entry of groups.values()) {
    if (entry.invalid || entry.current === null || entry.previous === null || entry.previous === 0) continue
    const monthAverage = entry.current / days, previousAverage = entry.previous / previousDays
    const declineValue = previousAverage - monthAverage, declineRate = declineValue / previousAverage * 100
    if (declineValue > 0 && declineValue + 1e-9 >= Number(value) && declineRate + 1e-9 >= Number(rate)) {
      const { current, previous, invalid, ...row } = entry
      results.push({ ...row, production: current, monthAverage, previousAverage, declineValue, declineRate })
    }
  }
  results.sort((a, b) => b.declineRate - a.declineRate || b.declineValue - a.declineValue)
  return { people: results.filter(r => r.channelType === '直销队伍'), channels: results.filter(r => r.channelType !== '直销队伍'), statDate: data.statDate }
}
