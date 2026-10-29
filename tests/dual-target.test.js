import test from 'node:test'
import assert from 'node:assert/strict'
import { targetValue, targetProgress } from '../src/utils/targetValues.js'
import { buildCapacityMetric } from '../src/utils/capacityMetrics.js'
import { parseTargetFile, targetTemplateCsv, targetColumns } from '../src/utils/imports/targets.js'
import { mockFetchDashboard, mockImportTargets } from '../src/api/mock.js'

const day = '2026-10-27'
const fixture = () => ({statDate:day, products:[{productId:'p',productName:'放号'}], organization:{branches:[{branchId:'B',branchName:'城区分公司'}],grids:[{gridId:'G',gridName:'东区网格',branchId:'B'}]},
  rows:[{gridId:'G',productId:'p',production:9000}], dailyRows:[{gridId:'G',productId:'p',date:day,production:270}],
  targets:[{gridId:'G',productId:'p',targetMonth:'2026-10',monthBaseTarget:8000,monthChallengeTarget:10000,dayBaseTarget:300,dayChallengeTarget:360,targetDate:day}]})
const file = row => ({text: async()=>targetColumns.join(',')+'\n'+row.join(',')})
const row = ['', '城区分公司','东区网格','p','2026-10',8000,10000,300,360,day]

test('single track uses challenge denominator, independent rates and capped visual fill',()=>{
  const metric=buildCapacityMetric(fixture(),'p',['G'])
  assert.equal(metric.daily.progressPercent,75)
  assert.equal(metric.daily.baseCompletionRate,90)
  assert.equal(metric.daily.challengeCompletionRate,75)
  assert.ok(Math.abs(metric.daily.basePosition-83.3333333)<.001)
  assert.equal(metric.baseCompletionRate,112.5)
  assert.equal(metric.challengeCompletionRate,90)
  assert.equal(metric.baseGap,0)
  assert.equal(metric.challengeGap,1000)
  assert.equal(targetProgress(12000,8000,10000).progressPercent,100)
  assert.equal(targetProgress(12000,8000,10000).challengeCompletionRate,120)
})
test('missing, zero and legacy targets are not invented or divided by zero',()=>{
  assert.equal(targetValue({month_base_target:''},'month'),null)
  assert.equal(targetValue({monthBaseTarget:null,target:99},'month'),null)
  assert.equal(targetValue({month_base_target:'0'},'month'),0)
  assert.equal(targetValue({target:25},'month','challenge'),null)
  assert.equal(targetValue({target:25},'month'),25)
  assert.equal(targetProgress(5,0,0).baseCompletionRate,null)
  assert.equal(targetProgress(null,300,360).progressPercent,null)
  assert.equal(targetProgress(0,300,360).baseCompletionRate,0)
  assert.equal(targetProgress(3,4,2).hasChallengeTarget,false)
})
test('partial grid targets, duplicate rows, stale month and daily dates are unavailable',()=>{
  const data=fixture()
  assert.equal(buildCapacityMetric(data,'p',['G','missing']).challengeTarget,null)
  data.targets[0].targetDate='2026-10-26'
  assert.equal(buildCapacityMetric(data,'p',['G']).daily.challengeTarget,null)
  data.targets[0].targetMonth='2026-09'
  assert.equal(buildCapacityMetric(data,'p',['G']).baseTarget,null)
  data.targets.push({...data.targets[0]})
  assert.equal(buildCapacityMetric(data,'p',['G']).challengeTarget,null)
})
test('new ten-column template round-trips IDs and four targets',async()=>{
  const data=fixture()
  const csv=targetTemplateCsv(data)
  assert.equal(csv.replace(/^\ufeff/,'').split('\r\n')[0],targetColumns.join(','))
  const records=await parseTargetFile({text:async()=>csv},data)
  assert.equal(records[0].gridId,'G')
  assert.equal(records[0].monthChallengeTarget,10000)
  assert.equal(records[0].dayChallengeTarget,360)
  assert.equal(records[0].targetMonth,'2026-10')
})
test('CSV supports quoted names, product names, normalized dates and null targets',async()=>{
  const source=[...row]; source[3]='放号';source[6]='';source[9]='20261027'
  const records=await parseTargetFile(file(source),fixture())
  assert.equal(records[0].targetDate,day)
  assert.equal(records[0].monthChallengeTarget,null)
})
test('target import rejects invalid month, dates, unknown scopes, negatives, duplicates and inverted goals',async()=>{
  for (const [index,value,expected] of [[4,'2026-09',/月份/],[9,'2026-02-30',/日期/],[9,'',/target_date/],[1,'其他分公司',/不匹配/],[5,-1,/非负/],[6,7000,/挑战目标/],[8,200,/挑战目标/]]) {
    const values=[...row];values[index]=value
    await assert.rejects(parseTargetFile(file(values),fixture()),expected)
  }
  await assert.rejects(parseTargetFile({text:async()=>targetColumns.join(',')+'\n'+row.join(',')+'\n'+row.join(',')},fixture()),/重复/)
})
test('demo exposes separate targets, scoped reads and partial admin imports preserve other rows',async()=>{
  const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}
  const before=await mockFetchDashboard({phone:'13800000009'})
  const first=before.targets[0]
  assert.ok(first.monthChallengeTarget>first.monthBaseTarget)
  assert.ok(first.dayChallengeTarget>=first.dayBaseTarget)
  await assert.rejects(mockImportTargets([first],{phone:'13800000001',isSuperAdmin:true}),/超级管理员/)
  await mockImportTargets([{...first,monthBaseTarget:8000,monthChallengeTarget:10000}],{phone:'13800000009'})
  const after=await mockFetchDashboard({phone:'13800000009'})
  assert.equal(after.targets.length,before.targets.length)
  assert.equal(after.targets.find(t=>t.gridId===first.gridId&&t.productId===first.productId).target,8000)
  const grid=await mockFetchDashboard({phone:'13800000003'})
  assert.ok(grid.targets.every(t=>t.gridId==='G001'))
})
