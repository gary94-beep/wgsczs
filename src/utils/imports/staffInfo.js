import { requireColumns } from './helpers.js'

const COLUMN_MAP = {
  staff_no: 'staff_no', staff_name: 'staff_name', branch: 'branch',
  grid: 'grid', job: 'job', team_type: 'team_type'
}

export function staffInfoRows(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('文件内容为空')
  const header = data[0].map(item => String(item || '').trim())
  requireColumns(header, ['staff_no', 'staff_name', 'branch', 'grid'])

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
    if (!record.staff_no) continue
    rows.push(record)
  }
  if (!rows.length) throw new Error('文件无有效数据行')
  return rows
}

export function staffInfoTemplateCsv() {
  const header = 'id,staff_no,staff_name,branch,grid,job,team_type'
  const sample = '必填（导入时请删除示例行）,必填,选填,选填,选填,选填,选填'
  return '\ufeff' + [header, sample].join('\r\n')
}