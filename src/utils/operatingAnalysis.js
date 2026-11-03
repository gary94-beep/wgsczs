import { buildMonthToDatePeriods } from './reportingPeriod.js'

const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
const number = value => Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 1 })

export function buildOperatingAnalysis(items, { statDate, period = 'month', showTargets = true } = {}) {
  if (!items.length) return { summary: '当前范围暂无可分析的产能数据。', advantage: '', weakness: '', action: '' }
  let dates
  try { dates = buildMonthToDatePeriods(statDate) } catch { return { summary: '统计日期缺失或无效，暂不能判断经营表现。', advantage: '', weakness: '', action: '' } }
  const days = Number(dates.current.endDate.slice(-2))
  const [year, month] = statDate.split('-').map(Number)
  const pace = period === 'day' ? 100 : days / new Date(Date.UTC(year, month, 0)).getUTCDate() * 100
  const metrics = items.map(item => {
    const progress = period === 'day' ? item.daily : item
    const current = period === 'day' ? item.daily?.production : item.monthAverage
    const base = period === 'day' ? item.weeklyAverage : item.previousAverage
    const rate = showTargets && valid(progress?.production) && valid(progress?.target) && progress.target > 0 && progress.hasTarget !== false ? progress.production / progress.target * 100 : null
    return { ...item, progress, rate, change: valid(current) && valid(base) && base > 0 ? (current - base) / base * 100 : null }
  })
  const comparable = metrics.filter(item => item.rate !== null)
  const trends = metrics.filter(item => item.change !== null)
  const baseline = period === 'day' ? (items.every(item => item.weekBasis === 'rolling7') ? '近7天日均' : '本周日均') : '上月同期日均'
  const reached = comparable.filter(item => item.rate + 1e-9 >= pace).length
  const summary = showTargets
    ? comparable.length ? `${period === 'day' ? '当日目标进度' : '本月序时进度'} ${number(pace)}%，${reached}/${comparable.length} 项${period === 'day' ? '达到日目标' : '达到序时进度'}。${comparable.length < metrics.length ? `${metrics.length - comparable.length} 项目标或产能数据不足。` : ''}` : `${metrics.length} 项指标目标或产能数据不足，暂不能判断完成进度。`
    : `当前分类不比较目标完成率，${trends.length}/${metrics.length} 项具有可比日均数据。`
  const leaders = [...comparable].sort((a, b) => b.rate - a.rate)
  const rising = [...trends].filter(item => item.change >= 10).sort((a, b) => b.change - a.change)
  const lagging = [...comparable].filter(item => item.rate < pace - 10).sort((a, b) => a.rate - b.rate)
  const falling = [...trends].filter(item => item.change <= -20).sort((a, b) => a.change - b.change)
  const leader = leaders[0], weak = lagging[0] || leaders.at(-1)
  const advantage = leader && leader.rate >= pace
    ? `${leader.productName}完成率 ${number(leader.rate)}%，${period === 'day' ? '已达日目标' : '进度领先'}。${rising[0] ? `${rising[0].productName}较${baseline} +${number(rising[0].change)}%。` : ''}`
    : rising[0] ? `${rising[0].productName}较${baseline} +${number(rising[0].change)}%。` : '暂无明确的进度或日均增长优势。'
  const weakness = falling[0]
    ? `${falling[0].productName}较${baseline} ${number(falling[0].change)}%，日均下滑需关注。`
    : weak ? `${lagging.length ? '进度短板' : '相对短板'}为${weak.productName}，完成率 ${number(weak.rate)}%${weak.progress.production < weak.progress.target ? `，目标缺口 ${number(weak.progress.target - weak.progress.production)} ${weak.unit}` : '，已达到目标'}。` : trends.length ? '可比产品未出现20%以上的日均下降。' : '暂无足够的目标或日均数据定位短板。'
  const focus = falling[0] || lagging[0]
  const action = focus ? `优先核实${focus.productName}的下滑或进度偏差，结合人员、渠道预警安排跟进。` : weak && weak.rate < 100 ? `优先补齐${weak.productName}目标缺口，保持优势产品产出。` : !comparable.length && !trends.length ? '优先补齐目标、产能与同期数据，再判断经营表现。' : '维持现有产出，持续关注日均变化和预警对象。'
  return { summary, advantage, weakness, action }
}
