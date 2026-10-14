import { requireColumns, normalizeStar } from './helpers.js'

const COLUMN_MAP = {
  uni_code: 'uni_code', chn_code: 'chn_code', chn_name: 'chn_name',
  branch: 'branch', grid_code: 'grid_code', grid: 'grid', star: 'star', star_level: 'star_level'
}

export function channelInfoRows(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('文件内容为空')
  const header = data[0].map(item => String(item || '').trim())
  requireColumns(header, ['uni_code', 'chn_code', 'chn_name', 'branch', 'grid_code', 'grid', 'star'])

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
    if (!record.chn_code) continue
    record.star_level = normalizeStar(record.star)
    rows.push(record)
  }
  if (!rows.length) throw new Error('文件无有效数据行')
  return rows
}

export function channelInfoTemplateCsv() {
  const header = 'id,uni_code,chn_code,chn_name,branch,grid_code,grid,star'
  const sample = '必填（导入时请删除示例行）,必填,必填,选填,选填,选填,选填,选填'
  return '\ufeff' + [header, sample].join('\r\n')
}