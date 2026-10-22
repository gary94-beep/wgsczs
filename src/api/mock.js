import { mockBranches, mockCapacityRows, mockGrids, mockPermissions, mockProducts, mockTargets } from '../data/mockData.js'
import { buildMonthToDatePeriods } from '../utils/reportingPeriod.js'
import { buildMockDailyRows } from '../data/mockDailyData.js'
import { mockSalesScripts } from '../data/mockSalesScripts.js'
import { searchCapacity } from '../utils/capacitySearch.js'
import { normalizeChannelType } from '../utils/channelTypes.js'
import { buildChangeAlerts } from '../utils/changeAlerts.js'
import { buildAlertTotals } from '../utils/alertTotals.js'

export async function mockFetchChangeAlerts(params) {
  const data = await mockFetchDashboard(params)
  return { ...buildChangeAlerts(data, params), totals: buildAlertTotals(data, params), totalSource: 'mockRecords' }
}

const delay = (ms = 180) => new Promise(resolve => setTimeout(resolve, ms))
const targetStoreKey = 'grid-ai-demo-targets-v1'
const salesScriptStoreKey = 'grid-ai-demo-sales-scripts-v1'

export async function mockFetchAiAnalysis(params = {}) {
  const data = await mockFetchDashboard(params)
  const permission = mockPermissions[params.phone]
  if (params.statDate && params.statDate !== data.statDate) return { rows: [] }
  const scopes = [
    ...(permission.role === 'city' ? [{ scopeType: 'city', scopeId: '全市' }] : []),
    ...(permission.role !== 'grid' ? data.organization.branches.map(b => ({ scopeType: 'branch', scopeId: b.branchId })) : []),
    ...data.organization.grids.map(g => ({ scopeType: 'grid', scopeId: g.gridId }))
  ]
  return { rows: scopes.map(scope => ({ ...scope, statDate: data.statDate, demo: true, updatedAt: '',
    answer: '总体情况：演示数据，仅用于查看分析排版，不代表真实经营结论。\n优势：演示内容，优势需以正式分析结果为准。\n短板：演示内容，短板需以正式分析结果为准。' })) }
}

export async function mockGetMobileByToken(token) {
  await delay()
  if (!token) throw new Error('token不能为空')
  return { mobile: '13800000000' }
}

export async function mockFetchAlerts(params) {
  const data = await mockFetchDashboard(params)
  const allowed = new Set(data.organization.grids.map(row => row.gridId))
  if ((params.gridIds || []).some(id => !allowed.has(id))) throw new Error('无权访问该网格')
  const ids = new Set(params.gridIds?.length ? params.gridIds : allowed)
  const threshold = Number(params.threshold)
  if (!Number.isFinite(threshold) || threshold < 0 || !['day', 'month'].includes(params.period)) throw new Error('预警参数无效')
  const source = (params.period === 'day' ? data.dailyRows.filter(r => r.date === data.statDate) : data.rows)
    .filter(r => ids.has(r.gridId) && r.productId === params.productId && (!params.channel || r.channel === params.channel))
  const groups = new Map()
  for (const r of source) {
    const type = normalizeChannelType(r.channelType)
    const key = JSON.stringify([r.gridId, type, type === '直销队伍' ? r.staffId : r.channelCode || r.microChannelName || r.channel])
    const group = groups.get(key) || { ...r, channelType: type, production: 0, staffCount: 0 }
    group.production += r.production; group.staffCount++; groups.set(key, group)
  }
  const low = [...groups.values()].filter(r => r.production <= threshold).sort((a, b) => a.production - b.production)
  return { people: low.filter(r => r.channelType === '直销队伍'), channels: low.filter(r => ['三星+渠道', '末梢渠道'].includes(r.channelType)), statDate: data.statDate, totals: buildAlertTotals(data, params), totalSource: 'mockRecords' }
}

export async function mockSearchCapacity(params) {
  const data = await mockFetchDashboard(params)
  const allowed = new Set(data.organization.grids.map(row => row.gridId))
  if ((params.gridIds || []).some(id => !allowed.has(id))) throw new Error('无权访问该网格')
  return { results: searchCapacity(data, { ...params, gridIds: params.gridIds?.length ? params.gridIds : [...allowed] }), statDate: data.statDate }
}

function readSalesScripts() {
  let saved = []
  try { const value = JSON.parse(localStorage.getItem(salesScriptStoreKey) || '[]'); if (Array.isArray(value)) saved = value } catch { /* Keep examples if local storage is invalid. */ }
  return mockSalesScripts.map(item => saved.find(script => script.productId === item.productId) || item)
}

export async function mockSaveSalesScript(script, permission) {
  await delay()
  if (permission?.role !== 'city') throw new Error('仅市公司账号可维护话术')
  if (!mockProducts.some(item => item.productId === script?.productId) || typeof script.content !== 'string' || !script.content.trim() || script.content.length > 4000) throw new Error('产品或话术内容无效')
  const updated = { productId: script.productId, content: script.content.trim(), updatedAt: new Date().toISOString(), status: 'maintained', source: '市公司维护' }
  localStorage.setItem(salesScriptStoreKey, JSON.stringify(readSalesScripts().filter(item => item.productId !== updated.productId).concat(updated)))
  return updated
}

export async function mockImportSalesScripts(rows, permission) {
  await delay()
  if (mockPermissions[permission?.phone]?.isSuperAdmin !== true) throw new Error('仅超级管理员可导入话术')
  if (!Array.isArray(rows) || !rows.length || rows.length > mockProducts.length) throw new Error('话术导入记录无效')
  const seen = new Set()
  for (const row of rows) {
    if (!mockProducts.some(product => product.productId === row.productId) || seen.has(row.productId) || typeof row.content !== 'string' || !row.content.trim() || row.content.length > 4000) throw new Error('话术存在无效产品、重复产品或无效内容')
    seen.add(row.productId)
  }
  const updatedAt = new Date().toISOString()
  const updates = rows.map(row => ({ productId: row.productId, content: row.content.trim(), updatedAt, status: 'maintained', source: '超级管理员导入' }))
  localStorage.setItem(salesScriptStoreKey, JSON.stringify(readSalesScripts().filter(row => !seen.has(row.productId)).concat(updates)))
  return { imported: updates.length }
}

function readTargets() {
  try {
    const saved = JSON.parse(localStorage.getItem(targetStoreKey) || 'null')
    return Array.isArray(saved) ? saved.filter(item => mockProducts.some(product => product.productId === item.productId)) : mockTargets
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
  const statDate = new Date().toLocaleDateString('sv-SE')
  const rows = mockCapacityRows.filter(item => (!branchId || item.branchId === branchId) && (!gridId || item.gridId === gridId))
  const dailyRows = buildMockDailyRows(rows, statDate)
  return {
    organization: { cityName: '中山市', branches: mockBranches.filter(item => !branchId || item.branchId === branchId), grids: mockGrids.filter(item => (!branchId || item.branchId === branchId) && (!gridId || item.gridId === gridId)) },
    statDate,
    periods: buildMonthToDatePeriods(statDate),
    products: mockProducts,
    salesScripts: readSalesScripts(),
    targets: readTargets().filter(item => (!branchId || mockGrids.some(grid => grid.gridId === item.gridId && grid.branchId === branchId)) && (!gridId || item.gridId === gridId)).map(item => ({ ...item,
      ...(item.dailyTarget === undefined ? { dailyTarget: Math.max(1, Math.round(item.target / 22)), targetDate: statDate } : {}) })),
    rows,
    dailyRows
  }
}

export async function mockImportTargets(rows, permission) {
  await delay()
  if (mockPermissions[permission?.phone]?.isSuperAdmin !== true) throw new Error('仅超级管理员可导入目标')
  const valid = new Set(mockTargets.map(item => `${item.gridId}|${item.productId}`))
  if (!Array.isArray(rows) || rows.length !== valid.size) throw new Error('目标表须覆盖全部网格产品')
  const seen = new Set()
  for (const item of rows) {
    const key = `${item.gridId}|${item.productId}`
    if (!valid.has(key) || seen.has(key) || !Number.isFinite(item.target) || item.target < 0) throw new Error('目标表存在无效或重复记录')
    if (item.dailyTarget !== undefined && item.dailyTarget !== null && (!Number.isFinite(item.dailyTarget) || item.dailyTarget < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(item.targetDate || ''))) throw new Error('日目标或日目标日期无效')
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

/**
 * 通用批量导入模拟
 * @param {'channelInfo'|'terminal'|'staff'} target
 * @param {Object[]} rows
 * @returns {Promise<{total:number, success:number, failed:number, errors:string[]}>}
 */
export async function mockImportRows(target, rows, permission) {
  await delay(300)
  const list = Array.isArray(rows) ? rows : []
  if (target === 'permission') {
    if (mockPermissions[permission?.phone]?.isSuperAdmin !== true) throw new Error('仅超级管理员可导入权限')
    for (const row of list) {
      if (row.phone === permission.phone && (row.enabled !== '1' || row.is_super_admin !== '1' || row.role !== 'city')) throw new Error('不能禁用或降级当前超级管理员')
      const branch = mockBranches.find(item => item.branchName === row.branch)
      const grid = mockGrids.find(item => item.gridName === row.grid && item.branchId === branch?.branchId)
      if ((row.role !== 'city' && !branch) || (row.role === 'grid' && !grid)) throw new Error('mock模式请选择演示数据中的组织；真实组织请使用真实模式')
    }
    for (const row of list) {
      const branch = mockBranches.find(item => item.branchName === row.branch)
      const grid = mockGrids.find(item => item.gridName === row.grid && item.branchId === branch?.branchId)
      if (row.enabled !== '1') delete mockPermissions[row.phone]
      else mockPermissions[row.phone] = { name: row.name, phone: row.phone, role: row.role, cityName: '中山市', branchId: branch?.branchId || '', branchName: row.branch, gridId: grid?.gridId || '', gridName: row.grid, isSuperAdmin: row.is_super_admin === '1' }
    }
  }
  return { total: list.length, success: list.length, failed: 0, errors: [] }
}
