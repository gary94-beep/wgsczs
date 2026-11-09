import { ensureXlsx } from './imports/helpers.js'

const teamNames = {own:'网格经理',people:'行随销',halls:'营业厅',stars:'3星+渠道',tail:'末梢渠道'}
const numeric = v => typeof v === 'number' && Number.isFinite(v) ? v : null
export function teamExportModel(data, {params, productName, scope, demo}) {
  if (!data?.statDate || !Array.isArray(data.low) || !Array.isArray(data.change)) throw new Error('导出数据不完整，请重试')
  const headers=['数据截止日','数据性质','盯控类型','分公司','网格','队伍类型','姓名/渠道名称','岗位','工号/渠道编码','产品','本月累计','上月同期累计','单位','本月日均','上月同期日均','日均变化值','日均变化率','跟进状态','跟进措施']
  const rows = (list,filter) => [headers,...list.map(row=>{
    if(params.branchId && row.branchId!==params.branchId || params.gridId && row.gridId!==params.gridId || params.team && row.team!==params.team) throw new Error('导出结果超出当前筛选范围')
    const m=row.metric||{}
    if(m.productId!==params.productId || m[filter]!==true) throw new Error('导出产品或盯控类型与筛选不一致')
    return [data.statDate,demo?'模拟数据':'系统数据',filter==='low'?'低产':'异动',row.branchId,String(row.gridId||'').split('::').slice(1).join('::'),teamNames[row.team]||row.team,row.name,row.role==='商企经理1'?'商企经理':row.role,
      String(row.code||'').startsWith('tail:')?'':String(row.code||''),productName,numeric(m.month),numeric(m.previous),m.unit,numeric(m.monthAverage),numeric(m.previousAverage),numeric(m.changeValue),numeric(m.changeRate)===null?null:m.changeRate/100,'未登记','']
  })]
  return {filename:`队伍盯控_${scope}_${productName}_${data.statDate}.xlsx`.replace(/[\\/:*?"<>|]/g,'_'),low:rows(data.low,'low'),change:rows(data.change,'change'),notes:[['筛选项','取值'],['月数据截止日',data.statDate],['组织范围',scope],['队伍',teamNames[params.team]||'五类队伍'],['产品',productName],['岗位',params.role||'全部岗位'],['关键词',params.query||''],['低产标准',`本月累计≤${data.criteria.threshold}，包含零产`],['异动标准',`较上月日均下降率≥${data.criteria.declineRate}%，且减少≥${data.criteria.declineValue}单位/日`],['低产记录数',data.low.length],['异动记录数',data.change.length],['口径说明','低产与异动可重叠；导出当前筛选条件下全部命中对象，不限屏幕当前页；工号/渠道无记录按0'],['跟进信息','未登记表示无系统跟进记录。Excel中的跟进填写不会自动回写数据库']]}
}
export function createTeamWorkbook(XLSX,model){
  const wb=XLSX.utils.book_new()
  for(const [name,rows] of [['低产明细',model.low],['异动明细',model.change],['筛选条件',model.notes]]){
    const sheet=XLSX.utils.aoa_to_sheet(rows)
    sheet['!cols']=name==='筛选条件'?[{wch:20},{wch:100}]:[12,12,10,18,16,15,30,16,24,18,14,16,10,16,18,16,16,16,40].map(wch=>({wch}))
    if(name!=='筛选条件'){
      sheet['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length-1,c:headersLength(rows)-1}})}
      for(let row=1;row<rows.length;row++)for(let col=10;col<=16;col++){
        const cell=sheet[XLSX.utils.encode_cell({r:row,c:col})];if(cell?.t==='n')cell.z=col===16?'+0.0%;-0.0%;0.0%':col===15?'+0.00;-0.00;0.00':col<12?'General':'0.00'
      }
    }
    XLSX.utils.book_append_sheet(wb,sheet,name)
  }
  return wb
}
const headersLength=rows=>rows[0].length
export async function downloadTeamWorkbook(options){
  const fetchTeamControl=options.queryApi
  if(typeof fetchTeamControl!=='function')throw new Error('导出接口未配置')
  const [data]=await Promise.all([fetchTeamControl({...options.params,exportMode:'1',managerCode:''},options.token),ensureXlsx()])
  const model=teamExportModel(data,options)
  window.XLSX.writeFile(createTeamWorkbook(window.XLSX,model),model.filename,{compression:true})
}
