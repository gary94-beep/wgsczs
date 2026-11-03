import { requireColumns } from './helpers.js'

const COLUMN_MAP = {
  branch_company: 'branch_company', grid_name: 'grid_name', channel_code: 'channel_code',
  channel_name: 'channel_name', prod_period_type: 'prod_period_type', product_name: 'product_name',
  capacity: 'capacity', stat_date: 'stat_date', snapshot_time: 'snapshot_time'
}

export function channelCapacityRows(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('文件内容为空')
  const header = data[0].map(item => String(item || '').trim())
  requireColumns(header, ['branch_company', 'grid_name', 'channel_code', 'channel_name', 'prod_period_type', 'product_name', 'capacity', 'stat_date'])

  const rows = []
  for (let i = 1; i < data.length; i++) {
    const line = data[i]
    if (!line || !line.some(cell => String(cell || '').trim())) continue
    const record = {}
    Object.keys(COLUMN_MAP).forEach(col => {
      const index = header.indexOf(col)
      const field = COLUMN_MAP[col]
      record[field] = String(index >= 0 && line[index] != null ? line[index] : '').trim()
    })
    if (!record.branch_company || !record.grid_name || !record.channel_name || !record.product_name) continue
    rows.push(record)
  }
  if (!rows.length) throw new Error('文件无有效数据行')
  return rows
}

export function channelCapacityTemplateCsv() {
  const header = 'id,branch_company,grid_name,channel_code,channel_name,prod_period_type,product_name,capacity,stat_date,snapshot_time'
  const sample = '必填（导入时请删除示例行）,必填,必填,必填,必填,必填,必填,必填,必填,选填'
  return '\ufeff' + [header, sample].join('\r\n')
}