import { mockBranches, mockCapacityRows, mockGrids, mockPermissions, mockProducts, mockTargets } from '../data/mockData.js'

const delay = (ms = 180) => new Promise(resolve => setTimeout(resolve, ms))
const targetStoreKey = 'grid-ai-demo-targets-v1'

function readTargets() {
  try {
    const saved = JSON.parse(localStorage.getItem(targetStoreKey) || 'null')
    return Array.isArray(saved) ? saved : mockTargets
  } catch {
    return mockTargets
  }
}

export async function mockFetchPermission(phone) {
  await delay()
  return mockPermissions[phone] || null
}

export async function mockFetchDashboard(params = {}) {
  await delay()
  const permission = mockPermissions[params.phone]
  if (!permission) throw new Error('该手机号暂无查看权限')
  const branchId = permission.role === 'city' ? '' : permission.branchId
  const gridId = permission.role === 'grid' ? permission.gridId : ''
  return {
    organization: { cityName: '中山市', branches: mockBranches.filter(item => !branchId || item.branchId === branchId), grids: mockGrids.filter(item => (!branchId || item.branchId === branchId) && (!gridId || item.gridId === gridId)) },
    statDate: new Date().toLocaleDateString('sv-SE'),
    products: mockProducts,
    targets: readTargets().filter(item => (!branchId || mockGrids.some(grid => grid.gridId === item.gridId && grid.branchId === branchId)) && (!gridId || item.gridId === gridId)),
    rows: mockCapacityRows.filter(item => (!branchId || item.branchId === branchId) && (!gridId || item.gridId === gridId))
  }
}

export async function mockImportTargets(rows, permission) {
  await delay()
  if (permission?.role !== 'city') throw new Error('仅市公司账号可导入目标')
  const valid = new Set(mockTargets.map(item => `${item.gridId}|${item.productId}`))
  if (!Array.isArray(rows) || rows.length !== valid.size) throw new Error('目标表须覆盖全部网格产品')
  const seen = new Set()
  for (const item of rows) {
    const key = `${item.gridId}|${item.productId}`
    if (!valid.has(key) || seen.has(key) || !Number.isFinite(item.target) || item.target < 0) throw new Error('目标表存在无效或重复记录')
    seen.add(key)
  }
  localStorage.setItem(targetStoreKey, JSON.stringify(rows))
  return { imported: rows.length }
}
