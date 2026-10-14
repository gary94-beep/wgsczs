import { parseCsv } from './helpers.js'

function normalizeDate(value) {
  const s = String(value || '').trim()
  if (!s) return ''
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  m = s.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/)
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return s
}

export async function parseTargetFile(file, dashboard) {
  if (!file) throw new Error('未选择文件')
  const data = parseCsv((await file.text()).replace(/^\ufeff/, ''))
  const includesDaily = data[0]?.join(',') === 'id,branch,grid,product_id,target_month,month_target,day_target,target_date'
  if (!includesDaily) throw new Error('请使用下载的目标模板')

  const header = data[0].map(item => String(item || '').trim())

  // 产品中英文映射
  const productIdMap = new Map()
  dashboard.products.forEach(p => {
    productIdMap.set(p.productId, p.productId)
    productIdMap.set(p.productName, p.productId)
  })

  const imported = new Map()

  for (const [index, row] of data.slice(1).entries()) {
    const record = {}
    header.forEach((col, i) => {
      record[col] = String(row[i] ?? '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim()
    })

    if (!record.branch && !record.grid && !record.product_id) continue
    if (record.id && record.id.startsWith('必填')) continue

    const gridId = `${record.branch}::${record.grid}`

    const rawProduct = record.product_id
    const productId = productIdMap.get(rawProduct)
    if (!productId) throw new Error(`第 ${index + 2} 行产品编号无效：${rawProduct}`)

    const key = `${gridId}|${productId}`
    const target = Number(record.month_target)

    // 只做"文件内重复"校验，不做"合法性"校验（合法交给后端）
    if (imported.has(key)) throw new Error(`第 ${index + 2} 行目标重复`)
    if (record.month_target === '' || !Number.isFinite(target) || target < 0) throw new Error(`第 ${index + 2} 行目标值无效`)

    const daily = record.day_target === '' ? null : Number(record.day_target)
    if (daily !== null && (!Number.isFinite(daily) || daily < 0)) throw new Error(`第 ${index + 2} 行日目标无效`)

    const targetDate = record.target_date ? normalizeDate(record.target_date) : ''
    if (targetDate && targetDate !== dashboard.statDate) throw new Error(`第 ${index + 2} 行日目标日期须为数据截止日 ${dashboard.statDate}`)

    imported.set(key, {
      gridId, productId,
      target,
      dailyTarget: daily,
      targetDate: targetDate || dashboard.statDate
    })
  }

  return [...imported.values()]
}

export function targetTemplateCsv(dashboard) {
  const header = 'id,branch,grid,product_id,target_month,month_target,day_target,target_date'
  const sample = '必填（导入时请删除示例行）,选填,选填,选填,选填,选填,选填,选填'
  const month = (dashboard.statDate || '').slice(0, 7)
  const lines = [header, sample, ...dashboard.organization.grids.flatMap(grid =>
    dashboard.products.map(product => {
      const item = dashboard.targets.find(t => t.gridId === grid.gridId && t.productId === product.productId && !t.channelType)
      return `,${grid.branchId},${grid.gridName},${product.productName},${month},${item?.target ?? ''},${item?.targetDate === dashboard.statDate ? item?.dailyTarget ?? '' : ''},${dashboard.statDate}`
    })
  )]
  return '\ufeff' + lines.join('\r\n')
}