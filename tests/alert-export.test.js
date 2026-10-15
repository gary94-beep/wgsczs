import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { buildAlertExport, createAlertWorkbook } from '../src/utils/alertExport.js'
const context = {}
vm.runInNewContext(readFileSync(new URL('../public/vendor/xlsx.full.min.js', import.meta.url), 'utf8'), context)
const XLSX = context.XLSX
const person = { gridId: 'G', branchId: 'B', productId: 'P', channelType: '直销队伍', staffId: '0001', staffName: '=not_a_formula', staffRole: '行销经理', production: 31 }
const data = { statDate: '2026-10-31', organization: { branches: [{ branchId: 'B', branchName: '城区分公司' }], grids: [{ gridId: 'G', gridName: '东区', branchId: 'B' }] }, periodRows: [{ ...person, period: 'mon' }, { ...person, production: 60, period: 'last_mon' }] }
const product = { productId: 'P', productName: '放号', unit: '户' }
const filters = { gridIds: ['G'], kind: 'low', period: 'month', threshold: 31, scope: '东区' }
const result = { statDate: data.statDate, people: [person], channels: [] }
test('xlsx export preserves identity strings, numeric comparisons, statuses and current filters', () => {
  const model = buildAlertExport({ data, result, product, filters, demo: true })
  assert.equal(model.rows[1][9], '0001')
  assert.equal(model.rows[1][16], 1)
  assert.equal(model.rows[1][17], 2)
  assert.equal(model.rows[1][18], -1)
  assert.equal(model.rows[1][19], -0.5)
  assert.equal(model.rows[1][21], '未登记')
  assert.match(model.filename, /模拟/)
  const workbook = createAlertWorkbook(XLSX, model)
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  const imported = XLSX.read(bytes, { type: 'array', cellNF: true })
  assert.equal(imported.Sheets['预警结果'].J2.t, 's')
  assert.equal(imported.Sheets['预警结果'].J2.v, '0001')
  assert.equal(imported.Sheets['预警结果'].H2.f, undefined)
  assert.equal(imported.Sheets['预警结果'].T2.v, -0.5)
  assert.match(imported.Sheets['预警结果'].T2.z, /%/)
  assert.ok(imported.Sheets['筛选条件'])
})
test('export rejects mismatched dates, out-of-scope rows and products', () => {
  assert.throws(() => buildAlertExport({ data, result: { ...result, statDate: '2026-10-30' }, product, filters }), /日期/)
  assert.throws(() => buildAlertExport({ data, result, product, filters: { ...filters, gridIds: ['OUT'] } }), /无权/)
  assert.throws(() => buildAlertExport({ data, result: { ...result, people: [{ ...person, gridId: 'OUT' }] }, product, filters }), /范围/)
})
test('missing history is blank, real follow-up fields are retained and zero rows still export headers', () => {
  const noHistory = { ...data, periodRows: [data.periodRows[0]] }
  const model = buildAlertExport({ data: noHistory, result: { ...result, people: [{ ...person, followUpStatus: '跟进中', followUpOwner: '经理', followUpAction: '回访' }] }, product, filters })
  assert.equal(model.rows[1][17], null)
  assert.equal(model.rows[1][19], null)
  assert.equal(model.rows[1][21], '跟进中')
  assert.equal(buildAlertExport({ data, result: { ...result, people: [] }, product, filters }).rows.length, 1)
})
