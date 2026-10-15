import { buildMonthToDatePeriods } from './reportingPeriod.js'
import { normalizeChannelType } from './channelTypes.js'

const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
const keyOf = row => JSON.stringify([row.gridId, row.productId, normalizeChannelType(row.channelType), normalizeChannelType(row.channelType) === '直销队伍' ? row.staffId : row.channelCode || JSON.stringify([row.serviceProvider, row.microChannelName || row.channel])])

export function buildAlertExport({ data, result, product, filters, demo = false }) {
  if (!result || !product || !data.statDate || result.statDate !== data.statDate) throw new Error('预警与看板日期不一致，请刷新后导出')
  const allowed = new Set(data.organization.grids.map(row => row.gridId))
  const ids = new Set(filters.gridIds)
  if ([...ids].some(id => !allowed.has(id))) throw new Error('无权导出该网格')
  const records = [...(result.people || []), ...(result.channels || [])]
  if (records.some(row => !ids.has(row.gridId) || row.productId !== product.productId || (filters.channel && row.channel !== filters.channel))) throw new Error('预警结果与筛选范围不一致，请重新查询')
  const dates = buildMonthToDatePeriods(data.statDate)
  const days = Number(dates.current.endDate.slice(-2)), previousDays = Number(dates.previous.endDate.slice(-2))
  const totals = new Map()
  const add = (row, previous) => {
    if (!ids.has(row.gridId) || row.productId !== product.productId) return
    const key = keyOf(row), entry = totals.get(key) || { current: null, previous: null, invalid: false }
    if (!numeric(row.production)) entry.invalid = true
    else { const field = previous ? 'previous' : 'current'; entry[field] = (entry[field] ?? 0) + row.production }
    totals.set(key, entry)
  }
  if (data.periodRows) {
    for (const row of data.periodRows) if (['mon', 'last_mon'].includes(row.period)) add(row, row.period === 'last_mon')
  } else {
    for (const row of data.rows) add(row, false)
    for (const row of data.dailyRows || []) if (row.date >= dates.previous.startDate && row.date <= dates.previous.endDate) add(row, true)
  }
  const headers = ['统计日期', '数据性质', '预警类型', '分公司', '网格', '产品', '对象类型', '姓名/渠道名称', '人员岗位', '员工编号', '渠道编码', '渠道星级', '区域服务商', '统计周期', '产能', '单位', '本月日均', '上月同期日均', '日均变化值', '日均变化率', '预警状态', '跟进状态', '负责人', '跟进措施', '备注']
  const rows = records.map(row => {
    const type = normalizeChannelType(row.channelType), total = totals.get(keyOf(row))
    const monthAverage = filters.kind === 'change' && numeric(row.monthAverage) ? row.monthAverage : total && !total.invalid && total.current !== null ? total.current / days : null
    const previousAverage = filters.kind === 'change' && numeric(row.previousAverage) ? row.previousAverage : total && !total.invalid && total.previous !== null ? total.previous / previousDays : null
    const difference = monthAverage !== null && previousAverage !== null ? monthAverage - previousAverage : null
    const percent = difference !== null && previousAverage > 0 ? difference / previousAverage : null
    return [data.statDate, demo ? '模拟数据' : '系统数据', filters.kind === 'change' ? '异动预警' : '低产预警',
      data.organization.branches.find(branch => branch.branchId === row.branchId)?.branchName || row.branchId,
      data.organization.grids.find(grid => grid.gridId === row.gridId)?.gridName || row.gridId, product.productName,
      type === '直销队伍' ? '直销人员' : type === '三星+渠道' ? '3星+渠道' : '末梢渠道',
      type === '直销队伍' ? row.staffName || '' : row.microChannelName || row.channel || '',
      type === '直销队伍' ? row.staffRole || '' : '', type === '直销队伍' ? String(row.staffId || '') : '',
      type === '三星+渠道' ? String(row.channelCode || '') : '', type === '三星+渠道' ? row.channelStar ?? '' : '',
      type === '末梢渠道' ? row.serviceProvider || '' : '', filters.kind === 'change' || filters.period === 'month' ? '本月' : '当日',
      numeric(row.production) ? row.production : null, product.unit, monthAverage, previousAverage, difference, percent,
      filters.kind === 'change' ? '异动' : row.production === 0 ? '零产' : '低产', row.followUpStatus || '未登记', row.followUpOwner || '', row.followUpAction || '',
      difference === null ? '同期数据不足，日均变化未计算' : previousAverage === 0 ? '上月同期日均为0，变化率不适用' : '']
  })
  const scope = filters.scope || '当前权限范围'
  const metadata = [['筛选条件', '取值'], ['数据截止日', data.statDate], ['数据性质', demo ? '模拟数据' : '系统数据'], ['组织范围', scope],
    ['网格', [...ids].map(id => data.organization.grids.find(grid => grid.gridId === id)?.gridName || id).join('、')], ['产品', product.productName],
    ['预警类型', filters.kind === 'change' ? '异动预警' : '低产预警'], ['统计周期', filters.kind === 'change' || filters.period === 'month' ? '本月' : '当日'], ['渠道', filters.channel || '全部渠道'],
    ['低产阈值', filters.kind === 'change' ? '' : filters.threshold], ['日均减少率阈值（%）', filters.kind === 'change' ? filters.declineRate : ''], ['日均减少值阈值', filters.kind === 'change' ? filters.declineValue : ''],
    ['本月范围', `${dates.current.startDate}至${dates.current.endDate}`], ['上月同期范围', `${dates.previous.startDate}至${dates.previous.endDate}`], ['导出记录数', rows.length],
    ['跟进状态口径', '未登记表示尚无系统跟进记录；在Excel填写的状态不会自动回写系统'], ['日均单位', `${product.unit}/日`]]
  const filename = `${filters.kind === 'change' ? '异动预警' : '低产预警'}_${scope}_${product.productName}_${data.statDate}${demo ? '_模拟' : ''}.xlsx`.replace(/[\\/:*?"<>|]/g, '_')
  return { filename, rows: [headers, ...rows], metadata }
}

export function createAlertWorkbook(XLSX, model) {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(model.rows)
  sheet['!cols'] = [12, 12, 12, 18, 18, 18, 14, 24, 16, 18, 22, 12, 24, 12, 12, 10, 16, 18, 18, 16, 12, 14, 16, 32, 40].map(wch => ({ wch }))
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: model.rows.length - 1, c: model.rows[0].length - 1 } }) }
  for (let row = 1; row < model.rows.length; row++) {
    for (const column of [14, 16, 17]) { const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })]; if (cell?.t === 'n') cell.z = '0.00' }
    const change = sheet[XLSX.utils.encode_cell({ r: row, c: 18 })]; if (change?.t === 'n') change.z = '+0.00;-0.00;0.00'
    const percent = sheet[XLSX.utils.encode_cell({ r: row, c: 19 })]; if (percent?.t === 'n') percent.z = '+0.00%;-0.00%;0.00%'
  }
  XLSX.utils.book_append_sheet(workbook, sheet, '预警结果')
  const filterSheet = XLSX.utils.aoa_to_sheet(model.metadata)
  filterSheet['!cols'] = [{ wch: 26 }, { wch: 85 }]
  XLSX.utils.book_append_sheet(workbook, filterSheet, '筛选条件')
  return workbook
}
