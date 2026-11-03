import {mockFetchDashboard} from './mock.js'
import {createBroadbandEngine} from '../utils/broadband.js'
const engine=createBroadbandEngine()
async function context(params) {
  const data=await mockFetchDashboard({phone:params.phone})
  const clock=engine.calendar(params.statDate||data.statDate)
  const grids=data.organization.grids.map(grid=>({branch:data.organization.branches.find(b=>b.branchId===grid.branchId)?.branchName||grid.branchId,grid:grid.gridName}))
  const selected=grids.filter(g=>(!params.branch||g.branch===params.branch)&&(!params.grid||g.grid===params.grid))
  if((params.branch||params.grid)&&!selected.length) throw new Error('当前演示权限范围内没有该组织')
  return {clock,grids:selected}
}
function rows(ctx,id) {
  const category=engine.category(id),targets={managers:15,clerks:9,installers:7.5,stars:6,residents:5}
  return ctx.grids.flatMap((grid,gi)=>Array.from({length:5},(_,i)=>{
    const target=id==='contractors'?[30,45,60,30,45][i]:targets[id]
    const expected=target*ctx.clock.elapsedDays/ctx.clock.daysInMonth
    const production=[0,Math.floor(expected*.4),Math.ceil(expected),Math.ceil(target*1.2),Math.floor(expected*.8)][i]
    return engine.entity({...grid,categoryId:id,identity:`BB-${id}-${gi}-${String(i+1).padStart(3,'0')}`,
      name:`演示${id==='managers'?(i%2?'商企经理':'行销经理'):category.name}${i+1}`,
      role:id==='managers'?(i%2?'商企经理':'行销经理'):category.name,location:'演示服务点',
      monthlyTarget:id==='residents'&&gi===0&&i===4?null:target,
      production:id==='contractors'&&gi===0&&i===4?null:production,
      previousProduction:Math.max(0,production+2),weekProduction:Math.max(0,production),previousWeekProduction:Math.max(0,production-1)},ctx.clock)
  }))
}
const base=ctx=>({statDate:ctx.clock.statDate,clock:ctx.clock,demo:true,missingPolicy:'current-no-record-is-zero-history-unknown'})
export async function mockBroadbandOverview(params) {
  const ctx=await context(params)
  return {...base(ctx),warnings:[],categories:engine.categories.map(c=>({...c,stats:engine.summarize(rows(ctx,c.id),ctx.clock)}))}
}
export async function mockBroadbandRegions(params) {
  const ctx=await context(params),category=engine.category(params.categoryId),records=rows(ctx,category.id),level=params.level||'branch'
  return {...base(ctx),category,level,stats:engine.summarize(records,ctx.clock),distribution:engine.distribution(records),rankingAnalysis:engine.rankingAnalysis(records,ctx.clock),regions:engine.regions(records,level,ctx.clock)}
}
export async function mockBroadbandDetails(params) {
  const ctx=await context(params),category=engine.category(params.categoryId),records=rows(ctx,category.id)
  return {...base(ctx),category,stats:engine.summarize(records,ctx.clock),distribution:engine.distribution(records),rankingAnalysis:engine.rankingAnalysis(records,ctx.clock),...engine.details(records,params)}
}
