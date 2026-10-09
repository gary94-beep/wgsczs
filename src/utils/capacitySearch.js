import { normalizeChannelType, matchesChannelType } from './channelTypes.js'

export function searchCapacity(dashboard, { query, kind = 'people', gridIds = [], productId = '', channelType = '' }) {
  const needle = String(query || '').trim().toLocaleLowerCase()
  if (!needle) return []
  const ids = new Set(gridIds)
  const keyOf = row => JSON.stringify(kind === 'people'
    ? [row.gridId, row.staffId || row.staffName, row.staffId ? '' : row.channelCode || row.channel]
    : [row.gridId, row.channelCode || row.microChannelName || row.channel, normalizeChannelType(row.channelType)])
  const groups = new Map()
  const matches = row => ids.has(row.gridId) && matchesChannelType(row, channelType)
  // Search monthly/latest-day records only, never historical identities outside the current scope.
  const currentDay = (dashboard.dailyRows || []).filter(row => row.date === dashboard.statDate)
  for (const row of [...dashboard.rows, ...currentDay].filter(matches)) {
    const fields = kind === 'people' ? [row.staffName, row.staffId] : [row.channel, row.microChannelName, row.channelCode]
    if (!fields.some(value => String(value || '').toLocaleLowerCase().includes(needle))) continue
    const key = keyOf(row)
    if (!groups.has(key)) groups.set(key, { key, name: kind === 'people' ? row.staffName || '姓名未提供' : row.microChannelName || row.channel || '渠道名称未提供', code: kind === 'people' ? row.staffId : row.channelCode, role: kind === 'people' ? row.staffRole : normalizeChannelType(row.channelType), branchId: row.branchId, gridId: row.gridId, values: new Map() })
  }
  const add = (rows, period) => {
    for (const row of rows.filter(matches)) {
      const group = groups.get(keyOf(row))
      if (!group) continue
      const metric = group.values.get(row.productId) || { day: null, month: null, dayMissing: false, monthMissing: false }
      if (typeof row.production === 'number' && Number.isFinite(row.production)) metric[period] = (metric[period] ?? 0) + row.production
      else metric[`${period}Missing`] = true
      group.values.set(row.productId, metric)
    }
  }
  add(dashboard.rows, 'month'); add(currentDay, 'day')
  return [...groups.values()].map(group => ({ ...group, values: dashboard.products.filter(product => !productId || product.productId === productId).map(product => {
    const value = group.values.get(product.productId)
    return { productId: product.productId, productName: product.productName, unit: product.unit, day: value?.dayMissing ? null : value?.day ?? null, month: value?.monthMissing ? null : value?.month ?? null }
  }) })).filter(group => group.values.some(value => value.day !== null || value.month !== null) || !productId)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN') || a.key.localeCompare(b.key))
}
