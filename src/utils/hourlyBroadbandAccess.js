import {createHourlyBroadbandEngine} from './hourlyBroadband.js'

const groups=createHourlyBroadbandEngine().groups
export function assertHourlyCitywide(data,params={}){
  const branches=data.options?.branches||[],grids=data.options?.grids||[]
  const hasCitywideOptions=groups.every(([branch,names])=>branches.includes(branch)&&names.every(grid=>grids.some(row=>row.branch===branch&&row.grid===grid)))
  const requestedBranch=params.branch||'',requestedGrid=params.grid||''
  const returned=data.scope||{}
  // Selecting a grid may infer its parent branch; a blank selection must never
  // be silently replaced with the signed-in user's own organization.
  const scopeMatches=(returned.grid||'')===requestedGrid && (requestedBranch?(returned.branch||'')===requestedBranch:requestedGrid?grids.some(row=>row.grid===requestedGrid&&row.branch===returned.branch):!returned.branch)
  if(!hasCitywideOptions || !scopeMatches){
    const error=new Error('宽带攻坚调度暂未返回全市数据，请联系管理员更新该模块服务后重试')
    error.code='ROLLOUT_SCOPE_MISMATCH';throw error
  }
  return data
}

