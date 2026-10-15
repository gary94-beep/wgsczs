import test from 'node:test'
import assert from 'node:assert/strict'
import { buildChangeAlerts } from '../src/utils/changeAlerts.js'

function fixture(date = '2026-10-31') {
  return { statDate: date, organization: { grids: [{ gridId: 'G' }] }, products: [{ productId: 'P' }], periodRows: [
    { gridId: 'G', productId: 'P', channelType: '直销队伍', staffId: 'S', production: 155, period: 'mon' },
    { gridId: 'G', productId: 'P', channelType: '直销队伍', staffId: 'S', production: 300, period: 'last_mon' }
  ] }
}
const params = { productId: 'P', gridIds: ['G'] }
test('change alerts align short months and require both decline thresholds', () => {
  const data = fixture(), result = buildChangeAlerts(data, params)
  assert.equal(result.people.length, 1)
  assert.equal(result.people[0].monthAverage, 5)
  assert.equal(result.people[0].previousAverage, 10)
  assert.equal(result.people[0].declineRate, 50)
  assert.equal(buildChangeAlerts(data, { ...params, declineRate: 51 }).people.length, 0)
  assert.equal(buildChangeAlerts(data, { ...params, declineValue: 6 }).people.length, 0)
  assert.throws(() => buildChangeAlerts(data, { ...params, gridIds: ['OUT'] }), /无权/)
  for (const declineRate of ['', -1, 101, Infinity]) assert.throws(() => buildChangeAlerts(data, { ...params, declineRate }), /阈值/)
})
test('missing, zero and invalid baselines are not fabricated as declines', () => {
  const data = fixture()
  data.periodRows.pop()
  assert.equal(buildChangeAlerts(data, { ...params, declineValue: 0 }).people.length, 0)
  data.periodRows.push({ ...data.periodRows[0], production: 0, period: 'last_mon' })
  assert.equal(buildChangeAlerts(data, { ...params, declineValue: 0 }).people.length, 0)
  data.periodRows[1].production = null
  assert.equal(buildChangeAlerts(data, params).people.length, 0)
})
test('multiple staff channels aggregate first; leap February aligns to 29 days', () => {
  const data = fixture('2024-03-31')
  data.periodRows[1].production = 290
  data.periodRows.push({ ...data.periodRows[0], production: 155 })
  assert.equal(buildChangeAlerts(data, { ...params, declineValue: 0, declineRate: 0 }).people.length, 0)
})
