export const monitorBranchNames = ['南部分公司', '北部分公司', '城区分公司', '高新分公司', '东部分公司']

// Only use organizations supplied by the authenticated API; never invent IDs or permissions.
export function monitorBranchOptions(branches = []) {
  return monitorBranchNames.map(name => branches.find(branch => String(branch.branchName || branch.branchId || '').trim() === name)).filter(Boolean)
}
