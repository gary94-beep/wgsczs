import test from 'node:test'
import assert from 'node:assert/strict'
import { mockFetchAiAnalysis } from '../src/api/mock.js'

globalThis.localStorage ||= { getItem: () => null }
test('mock AI is explicitly demo and respects city, branch and grid scopes', async () => {
  const city = await mockFetchAiAnalysis({ phone: '13800000009' })
  assert.ok(city.rows.some(r => r.scopeType === 'city' && r.scopeId === '全市'))
  assert.ok(city.rows.every(r => r.demo && r.answer.includes('不代表真实经营结论')))
  const branch = await mockFetchAiAnalysis({ phone: '13800000001' })
  assert.ok(branch.rows.every(r => r.scopeType !== 'city' && r.scopeId !== 'B02' && r.scopeId !== 'G002'))
  const grid = await mockFetchAiAnalysis({ phone: '13800000003' })
  assert.equal(grid.rows.length, 1)
  assert.equal(grid.rows[0].scopeType, 'grid')
  assert.equal(grid.rows[0].scopeId, 'G001')
})
test('mock AI rejects unknown identities and does not invent historical results', async () => {
  await assert.rejects(mockFetchAiAnalysis({ phone: 'unknown' }), /权限/)
  assert.deepEqual(await mockFetchAiAnalysis({ phone: '13800000009', statDate: '2000-01-01' }), { rows: [] })
})
