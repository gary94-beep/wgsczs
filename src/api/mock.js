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
    organization: {
      cityName: '中山市',
      branches: mockBranches.filter(item => !branchId || item.branchId === branchId),
      grids: mockGrids.filter(item => (!branchId || item.branchId === branchId) && (!gridId || item.gridId === gridId))
    },
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

/**
 * 模拟产能导入（区域/渠道/工号三张表通用）
 * @param {'region'|'channel'|'staff'} target
 * @param {Object[]} rows
 * @returns {Promise<{total:number, success:number, failed:number, errors:string[]}>}
 */
export async function mockImportCapacity(target, rows) {
  await delay(300)

  if (!['region', 'channel', 'staff'].includes(target)) {
    const list = Array.isArray(rows) ? rows : []
    return {
      total: list.length,
      success: 0,
      failed: list.length,
      errors: ['target 参数错误，应为 region / channel / staff']
    }
  }

  const list = Array.isArray(rows) ? rows : []
  const errors = []
  let success = 0
  let failed = 0

  list.forEach((row, index) => {
    const line = index + 1
    const capacity = Number(row.capacity)

    if (Number.isNaN(capacity)) {
      failed++
      errors.push(`第${line}行 capacity 不是合法数字：${row.capacity}`)
      return
    }
    if (capacity < 0) {
      failed++
      errors.push(`第${line}行 capacity 不能为负数：${row.capacity}`)
      return
    }
    if (!row.branch_company || !row.grid_name || !row.prod_period_type || !row.product_name || !row.stat_date) {
      failed++
      errors.push(`第${line}行缺少必填字段`)
      return
    }
    success++
  })

  if (success < 10) {
    return {
      total: list.length,
      success: 0,
      failed: list.length,
      errors: [`有效数据仅 ${success} 条，低于最小阈值 10 条，拒绝覆盖，防止误清表`]
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[Mock] 导入 ${target} 产能，共 ${list.length} 条，成功 ${success}，失败 ${failed}`, list)

  return { total: list.length, success, failed, errors }
}