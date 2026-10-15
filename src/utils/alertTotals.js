import { normalizeChannelType } from './channelTypes.js'

export function buildAlertTotals(data, params) {
  const allowed = new Set(data.organization.grids.map(row => row.gridId))
  if ((params.gridIds || []).some(id => !allowed.has(id))) throw new Error('无权访问该网格')
  const ids = new Set(params.gridIds?.length ? params.gridIds : allowed)
  const groups = { people: new Set(), stars: new Set(), tail: new Set() }
  for (const row of data.rows) {
    if (!ids.has(row.gridId) || (params.channel && (row.channel !== params.channel || row.productId !== params.productId))) continue
    const type = normalizeChannelType(row.channelType)
    const group = { '直销队伍': 'people', '三星+渠道': 'stars', '末梢渠道': 'tail' }[type]
    const identity = type === '直销队伍' ? row.staffId : row.channelCode || row.microChannelName || row.channel
    if (group && identity) groups[group].add(JSON.stringify([row.gridId, identity]))
  }
  return Object.fromEntries(Object.entries(groups).map(([key, values]) => [key, values.size]))
}
