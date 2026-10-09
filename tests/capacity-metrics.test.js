import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCapacityMetric, compareCapacity, dateRange, mean, weekStart } from '../src/utils/capacityMetrics.js'
import { buildMockDailyRows } from '../src/data/mockDailyData.js'
import { mockCapacityRows } from '../src/data/mockData.js'

function fixture() {
  return { statDate: '2026-10-08', targets: [{ gridId: 'G1', productId: 'p', target: 40, dailyTarget: 2, targetDate: '2026-10-08' }],
    rows: [{ gridId: 'G1', productId: 'p', production: 36, channelType: '3星+渠道' }],
    dailyRows: [...dateRange('2026-10-01', '2026-10-08').map((date, i) => ({ gridId: 'G1', productId: 'p', channelType: '3星+渠道', date, production: i + 1 })),
      ...dateRange('2026-09-01', '2026-09-08').map(date => ({ gridId: 'G1', productId: 'p', channelType: '3星+渠道', date, production: 2 }))] }
}

test('comparison reports absolute change and percentage without treating missing data as zero', () => {
  const increase = compareCapacity(6, 5.75)
  assert.equal(increase.difference, 0.25)
  assert.ok(Math.abs(increase.percent - 4.347826) < 0.000001)
  const decrease = compareCapacity(5.625, 5.875)
  assert.equal(decrease.difference, -0.25)
  assert.ok(decrease.percent < 0)
  assert.deepEqual(compareCapacity(0, 0), { difference: 0, percent: 0 })
  assert.deepEqual(compareCapacity(3, 0), { difference: 3, percent: null })
  assert.equal(compareCapacity(null, 3), null)
})

test('daily and monthly progress use independent targets and same-unit averages', () => {
  const result = buildCapacityMetric(fixture(), 'p', ['G1'])
  assert.equal(result.production, 36)
  assert.equal(result.gap, 4)
  assert.equal(result.completionRate, 90)
  assert.equal(result.daily.production, 8)
  assert.equal(result.daily.target, 2)
  assert.equal(result.daily.completionRate, 400)
  assert.equal(result.daily.gap, 0)
  assert.equal(result.weeklyAverage, 6.5)
  assert.equal(result.monthAverage, 4.5)
  assert.equal(result.previousAverage, 2)
  assert.equal(weekStart('2026-10-01'), '2026-09-28')
  assert.equal(weekStart('2026-01-01'), '2025-12-29')
})

test('category aliases filter history and never borrow overall targets', () => {
  const data = fixture()
  data.dailyRows.push({ gridId: 'G1', productId: 'p', channelType: '末梢', date: '2026-10-08', production: 100 })
  data.rows.push({ gridId: 'G2', productId: 'p', channelType: '3星+渠道', production: 100 })
  const filtered = buildCapacityMetric(data, 'p', ['G1'], '三星+渠道')
  assert.equal(filtered.production, 36)
  assert.equal(filtered.daily.production, 8)
  assert.equal(filtered.hasTarget, false)
  assert.equal(filtered.daily.hasTarget, false)
  data.targets.push({ gridId: 'G1', productId: 'p', channelType: '3星+渠道', target: 50, dailyTarget: 10, targetDate: '2026-10-08' })
  assert.equal(buildCapacityMetric(data, 'p', ['G1'], '三星+渠道').daily.completionRate, 80)
})

test('missing history is unavailable, zero history remains a valid zero', () => {
  const data = fixture()
  data.dailyRows = data.dailyRows.filter(row => row.date !== '2026-10-08')
  const missing = buildCapacityMetric(data, 'p', ['G1'])
  assert.equal(missing.daily.production, null)
  assert.equal(missing.weeklyAverage, null)
  assert.equal(missing.monthAverage, null)
  assert.equal(mean([{ value: 0 }, { value: 0 }]), 0)
  data.targets[0].targetDate = '2026-10-07'
  assert.equal(buildCapacityMetric(data, 'p', ['G1']).daily.hasTarget, false)
})

test('demo daily history reconciles to monthly totals and is stable across role scopes', () => {
  for (const statDate of ['2026-10-01', '2026-10-31', '2024-03-31', '2026-01-01']) {
    const all = buildMockDailyRows(mockCapacityRows, statDate)
    const subset = mockCapacityRows.filter(row => row.gridId === 'G002')
    assert.deepEqual(buildMockDailyRows(subset, statDate), all.filter(row => row.gridId === 'G002'))
    for (const source of mockCapacityRows) {
      const current = all.filter(row => row.gridId === source.gridId && row.staffId === source.staffId && row.productId === source.productId && row.date.slice(0, 7) === statDate.slice(0, 7))
      assert.equal(current.reduce((sum, row) => sum + row.production, 0), source.production)
    }
    const data = { statDate, targets: [], rows: mockCapacityRows, dailyRows: all }
    const result = buildCapacityMetric(data, 'newNumbers', ['G001'])
    assert.notEqual(result.weeklyAverage, null)
    if (statDate === '2026-10-31') assert.equal(result.previousSeries.at(-1).date, '2026-09-30')
    if (statDate === '2024-03-31') assert.equal(result.previousSeries.at(-1).date, '2024-02-29')
  }
})
