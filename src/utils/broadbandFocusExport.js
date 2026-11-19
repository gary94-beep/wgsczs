import {ensureXlsx} from './imports/helpers.js'

// Export all objects in the selected organization/category, independent of
// the detail list's page, keyword and tier. Never save a partial paged result.
export async function collectBroadbandFocus(queryApi,params,token){
  const rows=[],seen=new Set()
  let first
  for(let page=1;page<=2000;page++){
    const data=await queryApi({...params,status:'all',tier:'',query:'',page,pageSize:100},token)
    if(!data?.statDate || !Array.isArray(data.rows) || !Number.isInteger(data.pagination?.total))throw Error('导出数据不完整，请重新查询')
    if(!first)first=data
    if(data.statDate!==first.statDate || data.pagination.total!==first.pagination.total)throw Error('导出期间数据已变化，请重新查询')
    if(data.pagination.page!==page)throw Error('导出分页异常，请重新查询')
    for(const row of data.rows){
      if(params.branch && row.branch!==params.branch || params.grid && row.grid!==params.grid)throw Error('导出结果超出当前组织范围')
      const key=JSON.stringify([row.branch,row.grid,row.identity])
      if(seen.has(key))throw Error('导出翻页出现重复对象，请重新查询')
      seen.add(key);rows.push(row)
    }
    if(!data.pagination.hasMore){
      if(rows.length!==first.pagination.total)throw Error('导出记录数量不一致，请重新查询')
      return {statDate:first.statDate,demo:first.demo,rows}
    }
    if(!data.rows.length)throw Error('导出分页异常，请重新查询')
  }
  throw Error('导出记录过多，请缩小组织范围')
}
export function broadbandFocusModel(data,{category,scope}){
  const headers=['数据截止日','数据性质','分公司','网格','队伍类别','姓名/商家/渠道名称','岗位','工号/编码','服务点','产能状态','本月累计（条）','月目标（条）','时序应达（条）','月目标缺口（条）','月目标完成率','时序状态']
  const numeric=v=>typeof v==='number' && Number.isFinite(v)?v:null
  const sequence=row=>row.missingProduction?'待核实（产能异常）':row.missingTarget?'待核实（缺目标）':row.reached?'已达时序':row.status==='behind'?'未达时序':'暂无'
  const all=[headers,...data.rows.map(row=>[
    data.statDate,data.demo?'模拟数据':'系统数据',row.branch,row.grid,category.name,row.name,row.role,String(row.identity||''),row.location||'',row.missingProduction?'暂无数据':row.zero?'零产':row.low?'低产':'正常产出',numeric(row.production),numeric(row.monthlyTarget),numeric(row.expected),numeric(row.gap),numeric(row.completionRate)===null?null:row.completionRate/100,sequence(row)
  ])]
  return {filename:`宽带对象全量明细_${scope}_${category.name}_${data.statDate}.xlsx`.replace(/[\\/:*?"<>|]/g,'_'),all,notes:[['项目','说明'],['组织范围',scope],['队伍类别',category.name],['数据截止日',data.statDate],['对象总数',data.rows.length],['已达时序对象数',data.rows.filter(r=>r.reached).length],['未达时序对象数',data.rows.filter(r=>r.status==='behind').length],['零产对象数',data.rows.filter(r=>r.zero).length],['低产对象数',data.rows.filter(r=>!r.zero&&r.low).length],['筛选口径','当前权限及所选组织、队伍类别下全部对象，包含已达时序、未达时序、零产、低产及待核实对象；不受当前状态、列表页码、关键词及分层筛选限制'],['零产','本月累计0条'],['低产','本月累计1–3条，不含零产'],['状态说明','产能状态与时序状态分别列示，零产/低产与未达时序可能重叠']]}

}
export function createBroadbandFocusWorkbook(XLSX,model){
  const wb=XLSX.utils.book_new()
  for(const [name,rows] of [['全部对象',model.all],['导出说明',model.notes]]){
    const sheet=XLSX.utils.aoa_to_sheet(rows)
    sheet['!cols']=name==='导出说明'?[{wch:18},{wch:100}]:[13,12,18,16,18,30,20,25,32,12,18,18,18,20,20,24].map(wch=>({wch}))
    if(name!=='导出说明'){
      sheet['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length-1,c:15}})}
      for(let r=1;r<rows.length;r++){const cell=sheet[XLSX.utils.encode_cell({r,c:14})];if(cell?.t==='n')cell.z='0.0%'}
    }
    XLSX.utils.book_append_sheet(wb,sheet,name)
  }
  return wb
}
export async function downloadBroadbandFocus(options){
  const [data]=await Promise.all([collectBroadbandFocus(options.queryApi,options.params,options.token),ensureXlsx()])
  const model=broadbandFocusModel(data,options)
  window.XLSX.writeFile(createBroadbandFocusWorkbook(window.XLSX,model),model.filename,{compression:true})
}
