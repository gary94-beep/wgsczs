import test from 'node:test'
import assert from 'node:assert/strict'
import {monitorBranchNames,monitorBranchOptions} from '../src/utils/monitorBranches.js'
test('monitor shows only five named branches in stable order and preserves original IDs',()=>{
  const rows=[{branchId:'统筹',branchName:'市统筹'},...monitorBranchNames.slice().reverse().map((name,i)=>({branchName:name,branchId:`id${i}`})),{branchId:'other',branchName:'其他分公司'},{branchId:'全市',branchName:'全市'}]
  const options=monitorBranchOptions(rows)
  assert.deepEqual(options.map(row=>row.branchName),monitorBranchNames)
  assert.ok(options.every(row=>rows.includes(row)))
  assert.equal(rows.length,8)
})
test('branch options do not fabricate unauthorized organizations',()=>{
  const branch={branchId:'B',branchName:'城区分公司'}
  assert.deepEqual(monitorBranchOptions([branch]),[branch])
  assert.deepEqual(monitorBranchOptions([]),[])
})
