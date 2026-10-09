import test from 'node:test'
import assert from 'node:assert/strict'
import { searchCapacity } from '../src/utils/capacitySearch.js'
const row = { branchId: 'B1', gridId: 'G1', staffName: '张三', staffId: '0012', channel: '测试渠道', channelCode: '0001', channelType: '三星+渠道', productId: 'p1', production: 2 }
const dashboard = { statDate: '2026-10-08', products: [{ productId: 'p1', productName: '放号', unit: '户' }, { productId: 'p2', productName: '终端合约', unit: '单' }], rows: [row, { ...row, staffId: '0013', production: 3 }, { ...row, gridId: 'G2', production: 100 }, { ...row, channelCode: '0002', staffId: '0014', production: 7 }], dailyRows: [{ ...row, date: '2026-10-08', production: 0 }, { ...row, date: '2026-10-07', production: 90 }] }
test('Search scopes first, separates names by ID, preserves leading zero and missing day', () => {
  const all = searchCapacity(dashboard, { query: '张三', gridIds: ['G1'] })
  assert.equal(all.length, 3)
  assert.ok(all.every(item => item.gridId === 'G1'))
  const found = searchCapacity(dashboard, { query: '0012', gridIds: ['G1'] })
  assert.equal(found.length, 1)
  assert.equal(found[0].code, '0012')
  assert.equal(found[0].values[0].month, 2)
  assert.equal(found[0].values[0].day, 0)
  assert.equal(found[0].values[1].month, null)
  assert.deepEqual(searchCapacity(dashboard, { query: ' ', gridIds: ['G1'] }), [])
})
test('Channels aggregate members without merging different channel codes', () => {
  const channels = searchCapacity(dashboard, { query: '测试', kind: 'channels', gridIds: ['G1'] })
  assert.equal(channels.length, 2)
  assert.equal(channels.find(item => item.code === '0001').values[0].month, 5)
  assert.equal(searchCapacity(dashboard, { query: '0001', kind: 'channels', gridIds: ['G1'], channelType: '3星+渠道' }).length, 1)
  assert.equal(searchCapacity(dashboard, { query: '测试', kind: 'channels', gridIds: ['G1'], channelType: '末梢渠道' }).length, 0)
})
test('Invalid values do not silently become zero', () => {
  const found = searchCapacity({ ...dashboard, rows: [row, { ...row, production: null }] }, { query: '0012', gridIds: ['G1'] })
  assert.equal(found[0].values[0].month, null)
})
