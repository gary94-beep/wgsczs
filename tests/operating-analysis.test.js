import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOperatingAnalysis } from '../src/utils/operatingAnalysis.js'
const item = (name, production, target, average = 10, previous = 10) => ({ productName: name, unit: '户', production, target, hasTarget: true, monthAverage: average, previousAverage: previous, weeklyAverage: previous, daily: { production: average, target: 10, hasTarget: true } })
test('monthly rules use elapsed calendar progress, not a premature 100% expectation', () => {
  const report = buildOperatingAnalysis([item('放号', 60, 100), item('千兆', 50, 100)], { statDate: '2026-10-14' })
  assert.match(report.summary, /45.2%.*2\/2/)
  assert.match(report.advantage, /放号/)
  assert.match(report.weakness, /相对短板.*千兆/)
  assert.ok(!report.weakness.includes('进度短板'))
})
test('lagging progress and daily-average declines have deterministic priority', () => {
  const report = buildOperatingAnalysis([item('放号', 30, 100), item('千兆', 90, 100, 7, 10)], { statDate: '2026-10-14' })
  assert.match(report.weakness, /千兆.*-30%/)
  assert.match(report.action, /千兆/)
  const daily = buildOperatingAnalysis([item('放号', 30, 100, 5, 10)], { statDate: '2026-10-14', period: 'day' })
  assert.match(daily.summary, /100%.*0\/1/)
  assert.match(daily.weakness, /-50%/)
})
test('categories never borrow overall targets; missing data and zero baselines stay unknown', () => {
  const report = buildOperatingAnalysis([item('放号', 60, 100, 11, 10)], { statDate: '2026-10-14', showTargets: false })
  assert.ok(!report.advantage.includes('完成率'))
  assert.match(report.advantage, /\+10%/)
  const missing = buildOperatingAnalysis([item('放号', null, 0, null, 0)], { statDate: '2026-10-14' })
  assert.ok(!JSON.stringify(missing).includes('NaN'))
  assert.ok(!missing.summary.includes('0/0'))
  assert.match(buildOperatingAnalysis([], {}).summary, /暂无/)
})
