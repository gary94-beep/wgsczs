import { requireColumns } from './helpers.js'

export const importComment = '说明（导入自动跳过）'
export const teamTypes = ['行销经理', '商企经理', '装维随销']
const products = { newNumbers: '放号', plan119: '129+高套', terminal: '终端合约', homeBroadband: '手宽新增', gigabit: '千兆运营' }
const aliases = { 放号: 'newNumbers', '129+高套': 'plan119', '119+套餐': 'plan119', '高套（129+）': 'plan119', 终端合约: 'terminal', 手宽新增: 'homeBroadband', 千兆运营: 'gigabit' }

export function templateCsv(columns, notes) {
  const cell = value => /[,"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  return '\ufeff' + [columns.join(','), notes.map(cell).join(',')].join('\r\n')
}
export function importRecords(data, columns, required = columns.filter(c => c !== 'id')) {
  if (!Array.isArray(data) || !data.length) throw new Error('文件内容为空')
  const headers = data[0].map(v => String(v ?? '').replace(/^\ufeff/, '').trim().toLowerCase())
  requireColumns(headers, required)
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) throw new Error('表头存在重复列')
  const rows = []
  for (let i = 1; i < data.length; i++) {
    const line = data[i] || []
    if (!line.some(v => String(v ?? '').trim())) continue
    if (i === 1 && (String(line[0] || '').startsWith(importComment) || String(line[0] || '').startsWith('必填（导入时请删除示例行）'))) continue
    const record = { _line: i + 1 }
    for (const column of columns.filter(c => c !== 'id')) record[column] = String(line[headers.indexOf(column)] ?? '').trim()
    rows.push(record)
  }
  if (!rows.length) throw new Error('文件无有效数据行，请在注释行下填写数据')
  if (rows.length > 10000) throw new Error('一次最多导入10000行')
  return rows
}
export function targetNumber(value, field, line, integer = false) {
  const text = String(value ?? '').trim()
  if (!text || text === '无') return null
  const number = Number(text)
  if (!/^\d+(?:\.\d{1,2})?$/.test(text) || !Number.isFinite(number) || number < 0 || number >= 1e16 || !Number.isSafeInteger(Math.round(number * 100)) || (integer && !Number.isSafeInteger(number))) throw new Error(`第${line}行 ${field}须为非负${integer ? '整数' : '数，最多两位小数'}`)
  return number
}
export function requiredText(row, field, length) {
  if (!row[field] || row[field].length > length) throw new Error(`第${row._line}行 ${field}必填且不能超过${length}字`)
}
export function importMonth(value, line, allowMonthOnly = false) {
  const text = String(value || '').trim()
  const full = /^(\d{4})[-/](\d{1,2})$/.exec(text) || /^(\d{4})(\d{2})$/.exec(text)
  if (full && Number(full[1]) >= 1900 && Number(full[2]) >= 1 && Number(full[2]) <= 12) return `${full[1]}-${full[2].padStart(2,'0')}`
  const month = /^(\d{1,2})月$/.exec(text)
  if (allowMonthOnly && month && Number(month[1]) >= 1 && Number(month[1]) <= 12) return `${Number(month[1])}月`
  throw new Error(`第${line}行月份无效，请使用YYYY-MM${allowMonthOnly ? '（兼容10月）' : ''}`)
}
function uniqueRecords(rows, key) {
  const seen = new Set()
  return rows.map(row => {
    const id = key(row)
    if (seen.has(id)) throw new Error(`第${row._line}行存在重复业务键`)
    seen.add(id)
    const { _line, ...record } = row
    return record
  })
}

export const staffBroadbandColumns = ['id','type','name','branch','grid','business_hall','ngboss_id','monthly_kd_target']
export function staffBroadbandTemplateCsv() {
  return templateCsv(staffBroadbandColumns, [importComment+'：主键自动生成','岗位：营业员或终端驻店员','姓名（必填）','分公司（必填）','网格（必填）','营业厅或渠道名称（选填）','工号（文本，保留前导零）','宽带月目标；空白或无表示未配置，最多2位小数'])
}
export function staffBroadbandRows(data) {
  const rows = importRecords(data, staffBroadbandColumns)
  for (const row of rows) {
    for (const field of ['type','name','branch','grid','ngboss_id']) requiredText(row, field, 32)
    if (!['营业员','终端驻店员'].includes(row.type)) throw new Error(`第${row._line}行 type须为营业员或终端驻店员`)
    if (row.business_hall.length > 64) throw new Error(`第${row._line}行 business_hall不能超过64字`)
    row.monthly_kd_target = targetNumber(row.monthly_kd_target, 'monthly_kd_target', row._line)
  }
  return uniqueRecords(rows, row => row.ngboss_id)
}

export const staffCategoryColumns = ['id','target_month','team_type','product_id','product_name','month_base_target','month_challenge_target']
export function staffCategoryTemplateCsv() {
  return templateCsv(staffCategoryColumns, [importComment+'：主键自动生成','目标月份YYYY-MM','行销经理、商企经理或装维随销','产品ID或产品名，如homeBroadband','产品名称（可留空，按ID补齐）','月基础值；整数，空白或无表示未配置','月挑战值；整数，空白或无表示未配置'])
}
export function staffCategoryRows(data) {
  const rows = importRecords(data, staffCategoryColumns)
  for (const row of rows) {
    row.target_month = importMonth(row.target_month, row._line)
    if (!teamTypes.includes(row.team_type)) throw new Error(`第${row._line}行 team_type须为行销经理、商企经理或装维随销`)
    const id = products[row.product_id] ? row.product_id : aliases[row.product_id]
    if (!id) throw new Error(`第${row._line}行 product_id无法识别`)
    if (row.product_name && aliases[row.product_name] !== id && products[id] !== row.product_name) throw new Error(`第${row._line}行产品ID与名称不一致`)
    row.product_id = id; row.product_name = products[id]
    row.month_base_target = targetNumber(row.month_base_target, 'month_base_target', row._line, true)
    row.month_challenge_target = targetNumber(row.month_challenge_target, 'month_challenge_target', row._line, true)
    if (row.month_base_target === null && row.month_challenge_target === null) throw new Error(`第${row._line}行基础值和挑战值至少填写一项`)
    if (row.month_base_target !== null && row.month_challenge_target !== null && row.month_challenge_target < row.month_base_target) throw new Error(`第${row._line}行挑战值不能小于基础值`)
  }
  return uniqueRecords(rows, row => JSON.stringify([row.target_month,row.team_type,row.product_id]))
}

export const areaContractorColumns = ['id','branch','grid','chn_name','chn_code','monthly_kd_target','mon']
export function areaContractorTemplateCsv() {
  return templateCsv(areaContractorColumns, [importComment+'：主键自动生成','分公司（必填）','网格（必填）','包片商名称（必填）','渠道编码（文本，最多20字）','宽带月目标；空白或无表示未配置，最多2位小数','月份YYYY-MM，兼容10月，建议填写年份'])
}
export function areaContractorRows(data) {
  const rows = importRecords(data, areaContractorColumns)
  for (const row of rows) {
    requiredText(row,'branch',32); requiredText(row,'grid',32); requiredText(row,'chn_name',128); requiredText(row,'chn_code',20)
    row.monthly_kd_target = targetNumber(row.monthly_kd_target, 'monthly_kd_target', row._line)
    row.mon = importMonth(row.mon, row._line, true)
  }
  return uniqueRecords(rows, row => JSON.stringify([row.chn_code,row.mon]))
}
