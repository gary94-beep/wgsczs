import test from 'node:test'
import assert from 'node:assert/strict'
import { mockFetchDashboard, mockImportTargets, mockSaveSalesScript } from '../src/api/mock.js'
import { mockPermissions } from '../src/data/mockData.js'
import { buildMonthToDatePeriods } from '../src/utils/reportingPeriod.js'

const values = new Map()
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value)
}

test('city sees all five products, branches and grids', async () => {
  const data = await mockFetchDashboard({ phone: '13800000000' })
  assert.equal(data.products.length, 5)
  assert.ok(data.products.every(item => item.productId !== 'revenue'))
  assert.ok(data.targets.every(item => item.productId !== 'revenue'))
  assert.equal(data.organization.branches.length, 2)
  assert.equal(data.organization.grids.length, 3)
  assert.equal(data.targets.length, 15)
  assert.equal(data.rows.length, 16 * 5)
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
  assert.equal(data.targets.length, 5)
  assert.ok(data.rows.every(item => item.gridId === 'G001'))
})

test('only superadmin can replace targets in demo data', async () => {
  const original = await mockFetchDashboard({ phone: '13800000000' })
  const updated = original.targets.map(item => ({ ...item, target: item.target + 1, monthBaseTarget: item.target + 1 }))
  for (const phone of ['13800000000', '13800000001', '13800000003']) await assert.rejects(mockImportTargets(updated, { ...mockPermissions[phone], isSuperAdmin: true }), /仅超级管理员/)
  await mockImportTargets(updated, mockPermissions['13800000009'])
  const city = await mockFetchDashboard({ phone: '13800000000' })
  const branch = await mockFetchDashboard({ phone: '13800000001' })
  assert.equal(city.targets.reduce((sum, item) => sum + item.target, 0), original.targets.reduce((sum, item) => sum + item.target, 0) + 15)
  assert.equal(branch.targets.length, 10)
  assert.ok(branch.targets.every(item => city.targets.some(target => target.gridId === item.gridId && target.productId === item.productId && target.target === item.target)))
  values.clear()
})

test('previous month comparison aligns to the same cutoff day', () => {
  assert.deepEqual(buildMonthToDatePeriods('2026-09-18'), {
    current: { startDate: '2026-09-01', endDate: '2026-09-18' },
    previous: { startDate: '2026-08-01', endDate: '2026-08-18' }
  })
})

test('only city can maintain product scripts and timestamp is assigned on save', async () => {
  const script = { productId: 'newNumbers', content: '当前放号话术测试内容', updatedAt: '2000-01-01' }
  await assert.rejects(mockSaveSalesScript(script, mockPermissions['13800000001']), /仅市公司/)
  await assert.rejects(mockSaveSalesScript({ ...script, productId: 'revenue' }, mockPermissions['13800000000']), /无效/)
  await assert.rejects(mockSaveSalesScript({ ...script, content: ' ' }, mockPermissions['13800000000']), /无效/)
  const saved = await mockSaveSalesScript(script, mockPermissions['13800000000'])
  assert.equal(saved.status, 'maintained')
  assert.ok(Date.now() - new Date(saved.updatedAt).getTime() < 5000)
  const branch = await mockFetchDashboard({ phone: '13800000001' })
  assert.equal(branch.salesScripts.length, 5)
  assert.deepEqual(branch.salesScripts.find(item => item.productId === 'newNumbers'), saved)
  values.clear()
})

test('previous month comparison clamps large-month dates to the prior month end', () => {
  assert.equal(buildMonthToDatePeriods('2026-10-31').previous.endDate, '2026-09-30')
  assert.equal(buildMonthToDatePeriods('2024-03-31').previous.endDate, '2024-02-29')
  assert.equal(buildMonthToDatePeriods('2025-03-31').previous.endDate, '2025-02-28')
})
