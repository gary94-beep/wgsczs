import { requireColumns } from './helpers.js'
import { templateCsv, importComment } from './monthlyTargets.js'

const COLUMN_MAP = {
  staff_no: 'staff_no', staff_name: 'staff_name', agent: 'agent',
  branch: 'branch', grid: 'grid', chn_name: 'chn_name'
}

export function terminalInfoRows(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('文件内容为空')
  const header = data[0].map(item => String(item || '').trim())
  requireColumns(header, ['staff_no', 'staff_name', 'branch', 'grid'])

  const rows = []
  for (let i = 1; i < data.length; i++) {
    const line = data[i]
    if (i === 1 && /^(说明（导入自动跳过）|必填（导入时请删除示例行）)/.test(String(line?.[0] || ''))) continue
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

export function terminalInfoTemplateCsv() {
  const header = 'id,staff_no,staff_name,agent,branch,grid,chn_name'
  return templateCsv(header.split(','),[importComment+'：主键自动生成','员工工号（文本，必填）','姓名（必填）','区域服务商','分公司（必填）','网格（必填）','小微渠道名称'])
}
