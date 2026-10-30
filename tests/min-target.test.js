import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {targetValue,targetProgress,monthlyDailyTarget} from '../src/utils/targetValues.js'
import {buildCapacityMetric} from '../src/utils/capacityMetrics.js'
import {parseTargetFile,targetTemplateCsv,targetColumns} from '../src/utils/imports/targets.js'
const day='2026-10-30'
function fixture() { return {statDate:day,organization:{branches:[{branchId:'B',branchName:'城区分公司'}],grids:[{gridId:'B::东区',gridName:'东区',branchId:'B'}]},products:[{productId:'newNumbers',productName:'放号'}],rows:[{gridId:'B::东区',productId:'newNumbers',production:9000}],dailyRows:[{gridId:'B::东区',productId:'newNumbers',production:270,date:day}],targets:[{gridId:'B::东区',productId:'newNumbers',monthMinTarget:6000,monthBaseTarget:8000,monthChallengeTarget:10000,dayMinTarget:240,dayBaseTarget:300,dayChallengeTarget:360,targetMonth:'2026-10',targetDate:day}]} }
test('minimum names, optional blanks and zero are handled independently',()=>{
  assert.equal(targetValue({month_min_target:'6000'},'month','min'),6000)
  assert.equal(targetValue({dayMinTarget:0},'day','min'),0)
  assert.equal(targetValue({target:100},'month','min'),null)
  assert.equal(targetValue({monthMinTarget:''},'month','min'),null)
  const m=targetProgress(270,300,360,240)
  assert.equal(m.minCompletionRate,112.5)
  assert.equal(m.minGap,0)
  assert.equal(m.progressPercent,75)
  assert.ok(Math.abs(m.minPosition-66.6667)<.001)
  assert.equal(targetProgress(10,null,null,20).progressPercent,50)
  assert.equal(targetProgress(0,0,0,0).minCompletionRate,null)
  assert.equal(targetProgress(null,100,200,50).minGap,null)
  assert.equal(targetProgress(270,300,360).minTarget,null)
  assert.equal(targetProgress(270,300,360,400).hasMinTarget,false)
})
test('minimum follows summary precedence without double counting, supports zero and any date in month',()=>{
  const d=fixture();const ids=['B::东区']
  assert.equal(buildCapacityMetric(d,'newNumbers',ids).daily.minTarget,6000/31)
  d.targets.push({...d.targets[0],gridId:'全市::全市',monthMinTarget:7000,dayMinTarget:250})
  assert.equal(buildCapacityMetric(d,'newNumbers',ids,'',{level:'city'}).minTarget,7000)
  d.targets[1].monthMinTarget=0
  assert.equal(buildCapacityMetric(d,'newNumbers',ids,'',{level:'city'}).minTarget,0)
  d.targets.push({...d.targets[0],gridId:'B::B',monthMinTarget:6500})
  assert.equal(buildCapacityMetric(d,'newNumbers',ids,'',{level:'branch',id:'B'}).minTarget,6500)
  assert.equal(buildCapacityMetric(d,'newNumbers',[...ids,'missing']).minTarget,null)
  d.targets[0].targetDate='2026-10-29'
  assert.equal(buildCapacityMetric(d,'newNumbers',ids).daily.minTarget,6000/31)
  assert.equal(buildCapacityMetric(d,'newNumbers',ids,'三星+渠道').minTarget,null)
})
test('monthly-only template round trips including minimum; empty summary rows do not erase goals',async()=>{
  const d=fixture(), csv=targetTemplateCsv(d)
  assert.equal(targetColumns.length,8)
  const rows=await parseTargetFile({text:async()=>csv},d)
  assert.equal(rows.length,1)
  assert.equal(rows[0].monthMinTarget,6000)
  assert.equal(rows[0].dayMinTarget,6000/31)
  const cells=['','城区分公司','东区','newNumbers','2026-10',9000,8000,10000,240,300,360,day]
  await assert.rejects(parseTargetFile({text:async()=>targetColumns.join(',')+'\n'+cells.join(',')},d),/底线/)
  cells[5]=6000;cells[8]=400
  cells[8]=240;cells[11]=''
  const noDate=await parseTargetFile({text:async()=>targetColumns.join(',')+'\n'+cells.join(',')},d)
  assert.equal(noDate[0].targetDate,'')
})
const source=readFileSync(new URL('../sczs_biz_api.js',import.meta.url),'utf8')
function run(params={},admin=true,targetRows=null) {
  const queries=[], ctx={Params:{token:'test',funCode:'wgsc_importTargets',...params},JsResult:{},CustomizeUtil:{
    redisGet:()=>({data:{value:JSON.stringify({phone:'13800000009'})}}),
    abilitySql:(query,args)=>{
      queries.push({query,args});let rows=[]
      if(query.includes('app_open_api_c003_wgsc_target_1')) assert.ok(!/\b(day_min_target|day_base_target|day_challenge_target|target_date)\b/.test(query))
      if(query.includes('wgsc_permission')) rows=[{name:'Test',phone:'13800000009',role:1,super_admin:admin?1:0}]
      else if(query.includes('MAX(stat_date)')) rows=[{stat_date:day}]
      else if(query.includes('SELECT * FROM app_open_api_c003_wgsc_target_1 ')) {
        rows=targetRows || [{id:1,branch:'城区分公司',grid:'东区',product_id:'newNumbers',target_month:'2026-10',month_min_target:6000,month_base_target:8000,month_challenge_target:10000,day_min_target:240,day_base_target:300,day_challenge_target:360,target_date:day}]
        rows=rows.filter(row=>row.target_month===args.month || (query.includes('#{monthSlash}')&&row.target_month===args.monthSlash))
      }
      else if(query.includes('SUM(capacity) AS capacity')) rows=[{branch_company:'城区分公司',grid_name:'东区',product_name:'放号',prod_period_type:'mon',capacity:9000,invalid_count:0}]
      else if(query.includes('FROM (SELECT DISTINCT')) rows=[]
      return {retCode:'0',data:{results:rows}}
    }
  }}
  vm.runInNewContext(source,ctx,{timeout:1000})
  return {...JSON.parse(ctx.JsResult.result).result,queries}
}
test('gateway writes only monthly targets and works without daily or date columns, preserving admin and history',()=>{
  const goal={gridId:'城区分公司::东区',productId:'newNumbers',targetMonth:'2026-10',monthMinTarget:6000,monthBaseTarget:8000,monthChallengeTarget:10000,dayMinTarget:240,dayBaseTarget:300,dayChallengeTarget:360,targetDate:day}
  const result=run({rows:JSON.stringify([goal])})
  assert.equal(result.retCode,'0',result.retMsg)
  const insert=result.queries.find(q=>q.query.startsWith('INSERT'))
  assert.ok(insert.query.includes('app_open_api_c003_wgsc_target_1 '))
  assert.ok(insert.query.includes('month_min_target=VALUES(month_min_target)'))
  assert.ok(!insert.query.includes('day_min_target'))
  assert.ok(!insert.query.includes('target_date'))
  assert.ok(Object.values(insert.args).includes(6000))
  assert.equal(result.queries.some(q=>q.query.startsWith('DELETE')),false)
  const bad=run({rows:JSON.stringify([{...goal,monthMinTarget:9000}])})
  assert.notEqual(bad.retCode,'0');assert.equal(bad.queries.some(q=>q.query.startsWith('INSERT')),false)
  assert.notEqual(run({rows:JSON.stringify([goal])},false).retCode,'0')
})
test('business and AI target queries use the same new table and minimum fields',()=>{
  for(const file of ['../sczs_biz_api.js','../sczs_ai_api.js']) {
    const code=readFileSync(new URL(file,import.meta.url),'utf8')
    assert.ok(code.includes('targets: "app_open_api_c003_wgsc_target_1"'))
    assert.ok(!code.includes('app_open_api_c002_wgsc_target_1'))
    assert.ok(code.includes('month_min_target'))
  }
})
test('dashboard reads minimum values from the renamed table',()=>{
  const response=run({funCode:'wgsc_fetchDashboard'})
  assert.equal(response.retCode,'0',response.retMsg)
  assert.equal(response.data.targets[0].monthMinTarget,6000)
  assert.equal(response.data.targets[0].dayMinTarget,6000/31)
  const metric=buildCapacityMetric(response.data,'newNumbers',['城区分公司::东区'],'',{level:'grid',id:'城区分公司::东区'})
  assert.equal(metric.minTarget,6000)
  assert.equal(metric.daily.minTarget,6000/31)
})

test('platform screenshot rows with slash month and Chinese product produce six targets and exclude other months',()=>{
  const rows=[{id:1,branch:'全市',grid:'全市',product_id:'放号',target_month:'2026/10',month_base_target:75950,month_challenge_target:79050,month_min_target:72850,day_base_target:1,day_challenge_target:2,day_min_target:0,target_date:'2026-10-01 00:00:00'},
    {id:2,branch:'全市',grid:'全市',product_id:'放号',target_month:'2026/09',month_base_target:1}]
  const response=run({funCode:'wgsc_fetchDashboard'},true,rows)
  assert.equal(response.retCode,'0',response.retMsg)
  assert.equal(response.data.targets.length,1)
  const target=response.data.targets[0]
  assert.equal(target.productId,'newNumbers')
  assert.equal(target.targetMonth,'2026-10')
  assert.equal(target.targetDate,undefined)
  const metric=buildCapacityMetric(response.data,'newNumbers',['城区分公司::东区'],'',{level:'city'})
  assert.equal(metric.minTarget,72850);assert.equal(metric.baseTarget,75950);assert.equal(metric.challengeTarget,79050)
  assert.equal(metric.daily.minTarget,2350);assert.equal(metric.daily.baseTarget,2450);assert.equal(metric.daily.challengeTarget,2550)
})

test('AI input also matches slash months, Chinese product names and datetime targets',()=>{
  const ai=readFileSync(new URL('../sczs_ai_api.js',import.meta.url),'utf8').replace(/var MOBILEWORK_SECRET = "[^"]*";/,'var MOBILEWORK_SECRET = "test-only";')
  const queries=[],ctx={Params:{funCode:'wgsc_aiFetchAnalysisInput',secret:'test-only',statDate:day,scopeType:'city'},JsResult:{},CustomizeUtil:{abilitySql:(query,args)=>{
    queries.push({query,args});let rows=[]
    if(query.includes('FROM app_open_api_c003_wgsc_target_1')) {
      assert.ok(!/\b(day_min_target|day_base_target|day_challenge_target|target_date)\b/.test(query))
      assert.ok(query.includes('target_month IN (#{month},#{monthSlash})'))
      assert.equal(args.monthSlash,'2026/10')
      rows=[{id:1,branch:'全市',grid:'全市',product_id:'放号',month_base_target:75950,month_challenge_target:79050,month_min_target:72850,day_base_target:1,day_challenge_target:2,day_min_target:0,target_date:null}]
    }
    return {retCode:'0',data:{results:rows}}
  }}}
  vm.runInNewContext(ai,ctx,{timeout:1000})
  const result=JSON.parse(ctx.JsResult.result).result
  assert.equal(result.retCode,'0',result.retMsg)
  const p=result.data.products.find(p=>p.productId==='newNumbers')
  assert.equal(p.monthTarget,75950);assert.equal(p.dayTarget,2450)
  assert.equal(p.monthMinTarget,72850);assert.equal(p.dayChallengeTarget,2550)
})

test('monthly daily goals use calendar days, keep precision, ignore date and never borrow another month',()=>{
  for(const [month,days] of [['2026-02',28],['2024-02',29],['2026-04',30],['2026-10',31]]) {
    const row={targetMonth:month,monthBaseTarget:1000,monthMinTarget:0,monthChallengeTarget:null,dayBaseTarget:999,targetDate:'2000-01-01'}
    for(const date of [month+'-01',month+'-'+days]) {
      assert.equal(monthlyDailyTarget(row,date),1000/days)
      assert.equal(monthlyDailyTarget(row,date,'min'),0)
      assert.equal(monthlyDailyTarget(row,date,'challenge'),null)
    }
    assert.equal(monthlyDailyTarget(row,'2027-01-01'),null)
  }
})
