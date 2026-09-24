import test from 'node:test'
import assert from 'node:assert/strict'
import { mockFetchDashboard, mockImportTargets } from '../src/api/mock.js'
import { mockPermissions } from '../src/data/mockData.js'

const values = new Map()
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value)
}

test('city sees all six products, branches and grids', async () => {
  const data = await mockFetchDashboard({ phone: '13800000000' })
  assert.equal(data.products.length, 6)
  assert.equal(data.organization.branches.length, 2)
  assert.equal(data.organization.grids.length, 3)
  assert.equal(data.targets.length, 18)
  assert.equal(data.rows.length, 16 * 6)
  assert.ok(data.rows.some(item => item.production === 0))
})

test('branch only receives its own rows and targets', async () => {
  const data = await mockFetchDashboard({ phone: '13800000002' })
  assert.deepEqual(data.organization.branches.map(item => item.branchId), ['B02'])
  assert.deepEqual(data.organization.grids.map(item => item.gridId), ['G002'])
  assert.ok(data.rows.every(item => item.branchId === 'B02'))
  assert.ok(data.targets.every(item => item.gridId === 'G002'))
})

test('grid manager only receives one grid', async () => {
  const data = await mockFetchDashboard({ phone: '13800000003' })
  assert.deepEqual(data.organization.grids.map(item => item.gridId), ['G001'])
  assert.equal(data.targets.length, 6)
  assert.ok(data.rows.every(item => item.gridId === 'G001'))
})

test('only city can replace targets in demo data', async () => {
  const original = await mockFetchDashboard({ phone: '13800000000' })
  const updated = original.targets.map(item => ({ ...item, target: item.target + 1 }))
  await assert.rejects(mockImportTargets(updated, mockPermissions['13800000001']), /仅市公司/)
  await mockImportTargets(updated, mockPermissions['13800000000'])
  const city = await mockFetchDashboard({ phone: '13800000000' })
  const branch = await mockFetchDashboard({ phone: '13800000001' })
  assert.equal(city.targets.reduce((sum, item) => sum + item.target, 0), original.targets.reduce((sum, item) => sum + item.target, 0) + 18)
  assert.equal(branch.targets.length, 12)
  assert.ok(branch.targets.every(item => city.targets.some(target => target.gridId === item.gridId && target.productId === item.productId && target.target === item.target)))
  values.clear()
})
