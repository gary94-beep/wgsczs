/*
 * 平台后端适配示意：ctx.user 必须是平台已认证身份。
 * 数据表、查询 API 和事务 API 需按实际公司平台替换。
 * 不要使用请求体里的 phone/branchId/gridId 决定查询范围。
 */

const products = [
  { productId: 'revenue', productName: '收入', unit: '万元' },
  { productId: 'newNumbers', productName: '放号', unit: '户' },
  { productId: 'plan119', productName: '119+套餐', unit: '户' },
  { productId: 'terminal', productName: '终端合约', unit: '单' },
  { productId: 'homeBroadband', productName: '手宽新增', unit: '户' },
  { productId: 'gigabit', productName: '千兆运营', unit: '户' }
]

function ok(data) { return { success: true, data } }

async function permissionOf(ctx) {
  if (!ctx.user?.phone) throw new Error('登录状态无效')
  const permission = await ctx.db.grid_permissions.findOne({ phone: ctx.user.phone, enabled: true })
  if (!permission || !['city', 'branch', 'grid'].includes(permission.role)) throw new Error('无查看权限')
  if (permission.role !== 'city' && !permission.branchId) throw new Error('未绑定分公司')
  if (permission.role === 'grid' && !permission.gridId) throw new Error('未绑定网格')
  return permission
}

async function grid_ai_get_permission(ctx) {
  const permission = await permissionOf(ctx)
  return ok({ name: permission.name, phone: ctx.user.phone, role: permission.role, cityName: permission.cityName, branchId: permission.branchId, branchName: permission.branchName, gridId: permission.gridId, gridName: permission.gridName })
}

async function grid_ai_get_dashboard(ctx) {
  const permission = await permissionOf(ctx)
  const period = ctx.statPeriod // 由平台提供统一统计周期，例如 2026-09
  const branchQuery = permission.role === 'city' ? {} : { branchId: permission.branchId }
  const branches = await ctx.db.branches.find(branchQuery).toArray()
  const gridQuery = permission.role === 'grid' ? { gridId: permission.gridId, branchId: permission.branchId } : branchQuery
  const grids = await ctx.db.grids.find(gridQuery).toArray()
  const gridIds = grids.map(item => item.gridId)
  const targets = await ctx.db.grid_product_targets.find({ period, gridId: { $in: gridIds } }).toArray()
  const rows = await ctx.db.grid_capacity_period.find({ period, gridId: { $in: gridIds } }).toArray()
  return ok({
    organization: { cityName: permission.cityName, branches, grids },
    statDate: ctx.statDate,
    products,
    targets: targets.map(({ gridId, productId, target }) => ({ gridId, productId, target: Number(target) })),
    rows: rows.map(({ branchId, gridId, staffId, staffName, team, channel, productId, production }) => ({ branchId, gridId, staffId, staffName, team, channel, productId, production: Number(production || 0) }))
  })
}

async function grid_ai_import_targets(ctx, body) {
  const permission = await permissionOf(ctx)
  if (permission.role !== 'city') throw new Error('仅市公司可导入目标')
  const grids = await ctx.db.grids.find({}).toArray()
  const valid = new Set(grids.flatMap(grid => products.map(product => `${grid.gridId}|${product.productId}`)))
  const rows = body.rows
  if (!Array.isArray(rows) || rows.length !== valid.size) throw new Error('目标表须覆盖全部网格产品')
  const seen = new Set()
  for (const item of rows) {
    const key = `${item.gridId}|${item.productId}`
    if (!valid.has(key) || seen.has(key) || !Number.isFinite(item.target) || item.target < 0) throw new Error('目标表存在无效或重复记录')
    seen.add(key)
  }
  // 实际实现应在同一事务中按 ctx.statPeriod 原子替换，并记录操作人、时间和文件版本。
  await ctx.db.grid_product_targets.replacePeriod(ctx.statPeriod, rows, ctx.user.phone)
  return ok({ imported: rows.length })
}

module.exports = { grid_ai_get_permission, grid_ai_get_dashboard, grid_ai_import_targets }
