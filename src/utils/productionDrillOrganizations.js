import {monitorBranchOptions} from './monitorBranches.js'
import {createHourlyBroadbandEngine} from './hourlyBroadband.js'

const groups=createHourlyBroadbandEngine().groups
export const productionDrillBranches=branches=>monitorBranchOptions(branches)

// Filter authorized API records only. Keep their real IDs and never fabricate
// missing organizations or move a grid into a different branch.
export function productionDrillGrids(organization,branchId){
  const branch=productionDrillBranches(organization.branches||[]).find(row=>row.branchId===branchId)
  const group=branch&&groups.find(([name])=>name===String(branch.branchName||branch.branchId).trim())
  if(!group)return []
  const seen=new Set()
  return (organization.grids||[]).filter(row=>{
    const name=String(row.gridName||'').trim()
    if(row.branchId!==branchId || !group[1].includes(name) || seen.has(name))return false
    seen.add(name);return true
  })
}
