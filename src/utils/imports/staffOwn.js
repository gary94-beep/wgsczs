import { importComment, templateCsv, importRecords, requiredText } from './monthlyTargets.js'

// 定义列名（不包含自动生成的 id）
const columns = ['branch', 'grid', 'staff_no', 'staff_name', 'team']

export function staffOwnRows(data) {
  // 必填校验
  const rows = importRecords(data, columns, ['branch', 'grid', 'staff_no', 'staff_name'])
  const seen = new Set()
  
  return rows.map(row => {
    // 文本必填校验及长度限制（根据截图，长度均为 32 或 64）
    for (const field of ['branch', 'grid', 'staff_no', 'staff_name', 'team']) {
      if (row[field]) {
        const maxLength = field === 'team' ? 64 : 32
        requiredText(row, field, maxLength)
      }
    }
    
    // 校验员工编号唯一性
    if (seen.has(row.staff_no)) throw new Error(`第${row._line}行员工编号重复`)
    seen.add(row.staff_no)
    
    const { _line, ...record } = row
    return record
  })
}

export function staffOwnTemplateCsv() {
  return templateCsv(columns, [
    '分公司（必填，最长32字）',
    '网格（必填，最长32字）',
    '员工编号（必填，最长32字，唯一）',
    '员工姓名（必填，最长32字）',
    '队伍（最长64字）'
  ])
}