const columns = ['姓名', '手机号', '权限等级', '分公司', '网格', '是否超级管理员', '是否启用']
const roles = { 市公司: 'city', 分公司: 'branch', 网格: 'grid', 网格长: 'grid', city: 'city', branch: 'branch', grid: 'grid' }
export function permissionRows(data) {
  const headers = (data[0] || []).map(value => String(value).trim())
  if (columns.some(col => !headers.includes(col))) throw new Error(`权限表须包含：${columns.join('、')}`)
  const seen = new Set(), result = []
  for (let i = 1; i < data.length; i++) {
    const row = Object.fromEntries(columns.map(col => [col, String(data[i][headers.indexOf(col)] ?? '').trim()]))
    // Pre-filled organization rows with no person are placeholders, not user accounts.
    if (!row.姓名 && !row.手机号) continue
    const record = { name: row.姓名, phone: row.手机号, role: roles[row.权限等级], branch: row.分公司, grid: row.网格, is_super_admin: row.是否超级管理员, enabled: row.是否启用 }
    if (!record.name || !/^1\d{10}$/.test(record.phone) || !record.role || !/^[01]$/.test(record.is_super_admin) || !/^[01]$/.test(record.enabled) || seen.has(record.phone)) throw new Error(`第${i + 1}行姓名、手机号、权限标志无效或重复`)
    if ((record.role === 'city' && (record.branch || record.grid)) || (record.role !== 'city' && !record.branch) || (record.role === 'branch' && record.grid) || (record.role === 'grid' && !record.grid) || (record.is_super_admin === '1' && record.role !== 'city')) throw new Error(`第${i + 1}行权限与组织范围不一致`)
    seen.add(record.phone); result.push(record)
  }
  if (!result.length) throw new Error('请至少填写一名人员的姓名和手机号')
  return result
}
