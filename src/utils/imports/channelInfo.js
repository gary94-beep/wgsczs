import { normalizeStar } from './helpers.js'
import { importRecords, templateCsv, importComment, targetNumber, requiredText } from './monthlyTargets.js'

const columns = ['id','chn_code','chn_name','branch','grid_code','grid','star','star_level','monthly_kd_target']

export function channelInfoRows(data) {
  const rows = importRecords(data, columns, ['chn_code','chn_name','branch','grid_code','grid','star','monthly_kd_target'])
  const seen = new Set()
  
  return rows.map(row => {
    for (const field of ['chn_code','chn_name','branch','grid']) {
      requiredText(row, field, field==='chn_name' ? 128 : 64)
    }
    
    if (!row.star_level) row.star_level = normalizeStar(row.star)
    if (!['营业厅','三星+','非三星+'].includes(row.star_level)) {
      throw new Error(`第${row._line}行star_level须为营业厅、三星+或非三星+`)
    }
    
    row.monthly_kd_target = targetNumber(row.monthly_kd_target,'monthly_kd_target',row._line)
    
    if (seen.has(row.chn_code)) throw new Error(`第${row._line}行渠道编码重复`)
    seen.add(row.chn_code)
    
    const {_line,...record} = row
    return record
  })
}

export function channelInfoTemplateCsv() {
  return templateCsv(columns, [
    importComment + '：主键自动生成',
    '渠道编码（文本，必填）',
    '渠道名称（必填）',
    '分公司（必填）',
    '网格编码',
    '网格（必填）',
    '星级，如三星、四星、五星',
    '营业厅、三星+、非三星+；留空按star判断',
    '宽带月目标；空白或无表示未配置，最多2位小数'
  ])
}