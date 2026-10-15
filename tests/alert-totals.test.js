import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAlertTotals } from '../src/utils/alertTotals.js'
test('mock populations deduplicate objects across products and respect grid scope', () => {
  const data = { organization: { grids: [{ gridId: 'G' }] }, rows: [
    { gridId: 'G', productId: 'P', channelType: '直销队伍', staffId: '001', channel: 'C' },
    { gridId: 'G', productId: 'P2', channelType: '直销队伍', staffId: '001', channel: 'C' },
    { gridId: 'G', productId: 'P', channelType: '三星+渠道', channelCode: 'C1', channel: '店' }
  ] }
  assert.deepEqual(buildAlertTotals(data, { gridIds: ['G'] }), { people: 1, stars: 1, tail: 0 })
  assert.deepEqual(buildAlertTotals(data, { gridIds: ['G'], productId: 'P', channel: 'C' }), { people: 1, stars: 0, tail: 0 })
  assert.throws(() => buildAlertTotals(data, { gridIds: ['OUT'] }), /无权/)
})
