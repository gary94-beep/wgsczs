import test from 'node:test'
import assert from 'node:assert/strict'
import { validateScriptImport, scriptTemplateCsv } from '../src/utils/salesScriptImport.js'
import { mockImportSalesScripts } from '../src/api/mock.js'
const products = [{ productId: 'newNumbers', productName: '放号' }]
test('Import template uses Chinese columns and quoted UTF8 CSV', () => {
  assert.match(scriptTemplateCsv(products), /^\ufeff"产品名称","话术内容"/)
  assert.deepEqual(validateScriptImport([['产品名称', '话术内容'], ['放号', '需求核实']], products), [{ productId: 'newNumbers', content: '需求核实' }])
})
test('Import rejects empty, duplicate, unknown product and long content', () => {
  for (const rows of [[], [['错误', '表头']], [['产品名称', '话术内容'], ['放号', '']], [['产品名称', '话术内容'], ['收入', '话术']], [['产品名称', '话术内容'], ['放号', '话术'], ['放号', '重复']], [['产品名称', '话术内容'], ['放号', '字'.repeat(4001)]]]) assert.throws(() => validateScriptImport(rows, products))
})
test('Import privilege checks authoritative mock account, not caller flags', async () => {
  for (const phone of ['13800000000', '13800000001', '13800000003', 'unknown']) await assert.rejects(mockImportSalesScripts([{ productId: 'newNumbers', content: '测试' }], { phone, role: 'city', isSuperAdmin: true }), /仅超级管理员/)
})
