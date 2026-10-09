export const channelTypes = ['三星+渠道', '末梢渠道', '直销队伍']

export function normalizeChannelType(value) {
  return ({ '3星+渠道': '三星+渠道', '末梢': '末梢渠道' })[value] || value || ''
}

export function matchesChannelType(row, channelType) {
  return !channelType || normalizeChannelType(row.channelType) === normalizeChannelType(channelType)
}
