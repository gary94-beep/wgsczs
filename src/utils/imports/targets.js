import { parseCsv } from './helpers.js'
import { targetValue } from '../targetValues.js'

export const targetColumns = [
  'id', 
  'branch', 
  'grid', 
  'product_id', 
  'target_month', 
  'month_base_target', 
  'month_challenge_target', 
  'day_base_target', 
  'day_challenge_target', 
  'target_date'
]

function normalizeDate(value) {
  const s = String(value || '').trim()
  if (!s) return ''
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return validDate(m)
  m = s.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/)
  if (m) return validDate(m)
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (m) return validDate(m)
  return ''
}

function validDate(m) {
  const s = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  const d = new Date(`${s}T00:00:00Z`)
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : ''
}

export async function parseTargetFile(file, dashboard) {
  if (!file) throw new Error('未选择文件')
  
  const rawText = (await file.text()).replace(/^\ufeff/, '')
  const data = parseCsv(rawText)
  if (!data || !data.length) throw new Error('模板内容为空')

  // 1. 提取表头并过滤掉末尾多余逗号产生的空列
  const header = data[0]
    .map(item => String(item ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim())
    .filter(item => item !== '')

  const expected = targetColumns.map(c => c.trim())
  const missing = expected.filter(col => !header.includes(col))
  if (missing.length) {
    throw new Error(
      '模板缺少必要的列。\n' +
      '当前表头：' + header.join(',') + '\n' +
      '缺少列：' + missing.join(',')
    )
  }

  const productIdMap = new Map()
  dashboard.products.forEach(p => {
    productIdMap.set(p.productId, p.productId)
    productIdMap.set(p.productName, p.productId)
  })

  const imported = new Map()
  const statMonth = (dashboard.statDate || '').slice(0, 7)
  const statDateStr = normalizeDate(dashboard.statDate)

  for (const [index, row] of data.slice(1).entries()) {
    const record = {}
    header.forEach((col, i) => {
      record[col] = String(row[i] ?? '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim()
    })

    if (!record.branch && !record.grid && !record.product_id) continue
    if (record.id && record.id.startsWith('必填')) continue

    const branchName = record.branch
    const gridName = record.grid
    const branch = dashboard.organization.branches.find(b => b.branchId === branchName || b.branchName === branchName)
    
    // 2. 兼容汇总行（全市、分公司汇总）
    let gridId = ''
    if (gridName === '全市') {
      // 全市汇总目标
      gridId = '全市::全市'
    } else if (branch && gridName === branch.branchName) {
      // 分公司汇总目标（比如 grid 叫“城区分公司”）
      gridId = `${branch.branchId}::${branch.branchId}`
    } else {
      // 常规网格
      const grid = dashboard.organization.grids.find(g => 
        (g.gridId === gridName || g.gridName === gridName) && branch && g.branchId === branch.branchId
      )
      if (!grid) throw new Error(`第 ${index + 2} 行分公司与网格不匹配（${branchName} - ${gridName}）`)
      gridId = grid.gridId
    }
    
    // 3. 校验月份
    let rowMonth = record.target_month
    if (rowMonth.includes('/')) rowMonth = rowMonth.replace(/\//g, '-')
    const matchMonth = rowMonth.match(/^(\d{4})-(\d{1,2})/)
    if (!matchMonth || `${matchMonth[1]}-${String(matchMonth[2]).padStart(2, '0')}` !== statMonth) {
      throw new Error(`第 ${index + 2} 行目标月份须与当前数据月份（${statMonth}）一致`)
    }

    // 4. 校验产品
    const rawProduct = record.product_id
    const productId = productIdMap.get(rawProduct)
    if (!productId) throw new Error(`第 ${index + 2} 行产品编号无效：${rawProduct}`)

    const key = `${gridId}|${productId}`
    const values = {}
    for (const period of ['month', 'day']) {
      for (const kind of ['base', 'challenge']) {
        const raw = record[`${period}_${kind}_target`]
        if (raw !== '' && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) {
          throw new Error(`第 ${index + 2} 行目标须为非负数或留空`)
        }
        values[`${period}${kind === 'base' ? 'Base' : 'Challenge'}Target`] = raw === '' ? null : Number(raw)
      }
      if (values[`${period}BaseTarget`] !== null && values[`${period}ChallengeTarget`] !== null && values[`${period}ChallengeTarget`] < values[`${period}BaseTarget`]) {
        throw new Error(`第 ${index + 2} 行挑战目标不能小于基础目标`)
      }
    }

    if (imported.has(key)) throw new Error(`第 ${index + 2} 行目标重复`)
    if (Object.values(values).every(v => v === null)) throw new Error(`第 ${index + 2} 行至少填写一个目标值`)

    // 5. 校验日期
    const targetDate = record.target_date ? normalizeDate(record.target_date) : ''
    if (record.target_date && !targetDate) throw new Error(`第 ${index + 2} 行目标日期无效`)
    if ((values.dayBaseTarget !== null || values.dayChallengeTarget !== null) && !targetDate) {
      throw new Error(`第 ${index + 2} 行填写日目标时必须填写 target_date`)
    }
    // if (targetDate && targetDate !== statDateStr) {
    //   throw new Error(`第 ${index + 2} 行日目标日期须为数据截止日 ${statDateStr}`)
    // }

    // 6. 写入 pending 记录
    imported.set(key, {
      // 后端要求 branch 和 grid 分开传，方便直接落库
      branch: gridId.split('::')[0],
      grid: gridId.split('::')[1],
      gridId, 
      productId,
      ...values, 
      targetMonth: statMonth,
      target: values.monthBaseTarget,
      dailyTarget: values.dayBaseTarget,
      targetDate
    })
  }

  if (!imported.size) throw new Error('目标文件没有有效记录')
  return [...imported.values()]
}

export function targetTemplateCsv(dashboard) {
  const header = targetColumns.join(',')
  const month = (dashboard.statDate || '').slice(0, 7)
  const cell = value => { 
    const s = String(value ?? ''); 
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s 
  }
  
  // 导出模板时，首行手动加上全市汇总行，方便用户参考
  const lines = [header]
  
  // 构建所有网格的列表（包含全市）
  const allGrids = [
    { gridId: '全市::全市', branchId: '全市', gridName: '全市', isSummary: true },
    ...dashboard.organization.grids
  ]

  allGrids.forEach(grid => {
    dashboard.products.forEach(product => {
      const item = dashboard.targets.find(t => t.gridId === grid.gridId && t.productId === product.productId && !t.channelType)
      const branch = dashboard.organization.branches.find(b => b.branchId === grid.branchId)
      const current = item?.targetDate === dashboard.statDate
      
      const branchName = grid.isSummary ? '全市' : (branch?.branchName || grid.branchId)
      
      lines.push([
        '', 
        branchName, 
        grid.gridName, 
        product.productId, 
        month,
        targetValue(item || {}, 'month'), 
        targetValue(item || {}, 'month', 'challenge'), 
        current ? targetValue(item, 'day') : '',
        current ? targetValue(item, 'day', 'challenge') : '', 
        dashboard.statDate
      ].map(cell).join(','))
    })
  })
  
  return '\ufeff' + lines.join('\r\n')
}