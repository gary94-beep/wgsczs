import test from 'node:test'
import assert from 'node:assert/strict'
import { permissionRows } from '../src/utils/permissionImport.js'
import { mockImportRows, mockFetchPermission, mockFetchDashboard } from '../src/api/mock.js'
import { mockPermissions } from '../src/data/mockData.js'
const header = ['姓名', '手机号', '权限等级', '分公司', '网格', '是否超级管理员', '是否启用']
test('permission form preserves city/branch/grid scope and skips unfilled organization rows', () => {
  const rows = permissionRows([header,
    ['', '', '分公司', '城区分公司', '', '0', '1'],
    ['City', '13800000100', '市公司', '', '', '0', '1'],
    ['Branch', '13800000101', '分公司', '城区分公司', '', '0', '1'],
    ['Grid', '13800000102', '网格', '城区分公司', '东区', '0', '1']])
  assert.deepEqual(rows.map(r => r.role), ['city', 'branch', 'grid'])
  assert.equal(rows[0].branch, '')
  assert.equal(rows[1].grid, '')
  assert.equal(rows[2].grid, '东区')
})
test('permission form rejects widened scopes, invalid flags and duplicate phone', () => {
  for (const row of [
    ['N', '13800000101', '分公司', '城区分公司', '东区', '0', '1'],
    ['N', '13800000101', '网格', '城区分公司', '', '0', '1'],
    ['N', '13800000101', '网格', '城区分公司', '东区', '1', '1'],
    ['N', '13800000101', '市公司', '城区分公司', '', '0', '1'],
    ['N', '13800000101', '市公司', '', '', '0', '2']]) assert.throws(() => permissionRows([header, row]))
  const row = ['N', '13800000101', '市公司', '', '', '0', '1']
  assert.throws(() => permissionRows([header, row, row]), /重复/)
})
test('mock permission import authorizes by registered administrator and scopes a new user', async () => {
  globalThis.localStorage = { getItem: () => null }
  const rows = permissionRows([header, ['Grid', '13800000123', '网格', '城区分公司', '城区一网格', '0', '1']])
  await assert.rejects(mockImportRows('permission', rows, { phone: '13800000000', isSuperAdmin: true }), /超级管理员/)
  await mockImportRows('permission', rows, mockPermissions['13800000009'])
  assert.equal((await mockFetchPermission('13800000123')).gridId, 'G001')
  assert.ok((await mockFetchDashboard({ phone: '13800000123' })).rows.every(r => r.gridId === 'G001'))
  await mockImportRows('permission', [{ ...rows[0], enabled: '0' }], mockPermissions['13800000009'])
  assert.equal(await mockFetchPermission('13800000123'), null)
})
