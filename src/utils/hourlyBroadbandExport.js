import {hourlyFormat,hourlyPercent,hourlyNumber,hourlyBelowCity} from './hourlyBroadbandDisplay.js'
import {ensureXlsx} from './imports/helpers.js'
export function hourlyReport(data){
  const f=hourlyFormat,pct=hourlyPercent
  const scope=data.scope.grid||data.scope.branch||'全市',s=data.summary
  const lines=[`宽带攻坚调度｜${scope}`,`手宽归档数据截至 ${data.asOf.label}`,`已归档${f(s.capacity)}条，日目标${f(s.target)}条，完成率${pct(s.rate)}，缺口${f(s.gap)}条。`]
  const behind=hourlyBelowCity(data);if(behind.length)lines.push(`低于全市完成率${pct(s.rate)}：${behind.map(r=>`${r.branch} ${pct(r.rate)}（低${f(r.behind)}个百分点）`).join('；')}。`)
  for(const c of ['A','B','C']){const rows=data.focus.filter(r=>r.category===c);if(rows.length)lines.push(`${c}类：${rows.map(r=>`${r.grid} ${pct(r.rate)}（差${f(r.gap)}条）`).join('；')}`)}
  lines.push('按全市同类日目标完成率选取：A类2个、B类3个、C类4个；只展示当前可查看范围。')
  return lines.join('\n')
}
export async function exportHourlyBroadband(data,demo){
  await ensureXlsx();const X=window.XLSX,wb=X.utils.book_new()
  const header=['数据截至','分公司','网格','类别','今日手宽归档','日目标','日目标完成率','缺口','需补产网格','数据性质']
  const rows=list=>[header,...list.map(r=>[data.asOf.label,r.branch,r.grid,r.category||'',hourlyNumber(r.capacity)??'暂无',hourlyNumber(r.target)??'暂无',hourlyNumber(r.rate)===null?'暂无':hourlyNumber(r.rate)/100,hourlyNumber(r.gap)??'暂无',r.focused?'已纳入':'',demo?'模拟数据':'系统数据'])]
  for(const [name,list] of [['分公司进度',data.branches],['网格进度',data.grids],['需补产网格',data.focus]]){
    const sheet=X.utils.aoa_to_sheet(rows(list));sheet['!cols']=[22,18,18,8,18,12,18,12,14,12].map(wch=>({wch}));
    for(let i=1;i<=list.length;i++){const cell=sheet[X.utils.encode_cell({r:i,c:6})];if(cell?.t==='n')cell.z='0.0%'}
    X.utils.book_append_sheet(wb,sheet,name)
  }
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['范围',data.scope.grid||data.scope.branch||'全市'],['截止',data.asOf.label],['口径','hour；product_name=手宽新增；capacity为当天截至该小时累计手宽归档量'],['目标','读取对应区域day_target，不平均分配，不合并父子层级'],['关注规则','全市同类日目标完成率从低到高；A类2个、B类3个、C类4个；同率按名称排序；缺目标不排名']]),'口径说明')
  X.writeFile(wb,`宽带攻坚调度_${data.scope.grid||data.scope.branch||'全市'}_${data.asOf.key}.xlsx`,{compression:true})
}
