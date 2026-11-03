import { importRecords, templateCsv, importComment, targetNumber, requiredText, teamTypes } from './monthlyTargets.js'
const columns = ['id','staff_no','staff_name','branch','grid','job','team_type','monthly_kd_target']
export function staffInfoRows(data) {
  const rows = importRecords(data, columns, ['staff_no','staff_name','branch','grid','monthly_kd_target'])
  const seen = new Set()
  return rows.map(row => {
    for (const field of ['staff_no','staff_name','branch','grid']) requiredText(row,field,64)
    row.job ||= row.team_type
    row.team_type ||= row.job
    if (!teamTypes.includes(row.team_type) || !row.job || (teamTypes.includes(row.job) && row.job !== row.team_type)) throw new Error(`第${row._line}行岗位和队伍类别无效或不一致`)
    row.monthly_kd_target = targetNumber(row.monthly_kd_target,'monthly_kd_target',row._line)
    if (seen.has(row.staff_no)) throw new Error(`第${row._line}行工号重复`)
    seen.add(row.staff_no)
    const {_line,...record} = row
    return record
  })
}
export function staffInfoTemplateCsv() {
  return templateCsv(columns,[importComment+'：主键自动生成','员工工号（文本，必填）','姓名（必填）','分公司（必填）','网格（必填）','岗位（行销经理、商企经理、装维随销）','队伍类别（可留空，默认使用job）','宽带月目标；空白或无表示未配置，最多2位小数'])
}
