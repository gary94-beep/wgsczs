import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
const source = readFileSync(new URL('../src/api/production.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replaceAll('import.meta.env', 'env').replaceAll('export async function', 'async function')
function api(isMock) {
  const calls = [], context = { isMock, env: { VITE_COMMON_SERVICE_CODE: 'COMMON', VITE_BIZ_SERVICE_CODE: 'BIZ' }, postHandle2: (id, data) => { calls.push({ id, data }); return data } }
  for (const name of ['FetchDashboard', 'FetchPermission', 'GetMobileByToken', 'FetchAlerts', 'SearchCapacity', 'ImportTargets', 'ImportCapacity', 'ImportRows', 'SaveSalesScript', 'ImportSalesScripts']) context[`mock${name}`] = (...args) => { calls.push({ mock: name, args }); return {} }
  vm.createContext(context); vm.runInContext(source, context)
  return { context, calls }
}
test('all real wrappers select the proper Handle2 gateway and wgsc function', async () => {
  const { context: c, calls } = api(false), admin = { isSuperAdmin: true }
  await c.fetchPermission('13800000000', '')
  await c.getMobileByToken('TOKEN')
  await c.fetchDashboard({ phone: 'spoof' }, 'TOKEN')
  await c.fetchAlerts({ gridIds: ['G'], threshold: 1, productId: 'newNumbers', period: 'day' }, 'TOKEN')
  await c.queryCapacity({ gridIds: ['G'], query: 'S', kind: 'people' }, 'TOKEN')
  await c.importTargets([], admin, 'TOKEN')
  await c.saveSalesScript({}, admin, 'TOKEN')
  await c.importSalesScripts([], admin, 'TOKEN')
  await c.importCapacity('region', [], 'TOKEN')
  await c.importRows('staff', [], 'TOKEN')
  assert.equal(calls.length, 10)
  assert.ok(calls.every(call => call.id === 'ability_customize' && call.data.params.funCode.startsWith('wgsc_')))
  assert.ok(calls.slice(0, 2).every(call => call.data.servicecode === 'COMMON'))
  assert.ok(calls.slice(2).every(call => call.data.servicecode === 'BIZ' && call.data.token === 'TOKEN' && call.data.params.token === 'TOKEN'))
  assert.equal(calls[3].data.params.gridIds, '["G"]')
  assert.equal(calls[2].data.params.phone, undefined)
  await assert.rejects(c.fetchDashboard({}, ''), /token/)
  await assert.rejects(c.importTargets([], {}, 'TOKEN'), /超级管理员/)
})
test('mock switch includes capacity imports and script methods with no HTTP calls', async () => {
  const { context: c, calls } = api(true)
  await c.importCapacity('region', [], '')
  await c.importRows('staff', [], '')
  await c.saveSalesScript({}, { isSuperAdmin: true }, '')
  await c.importSalesScripts([], { isSuperAdmin: true }, '')
  await c.fetchAlerts({ gridIds: [] }, '')
  await c.queryCapacity({ query: 'test' }, '')
  assert.ok(calls.every(call => call.mock))
  assert.deepEqual(calls.map(call => call.mock), ['ImportCapacity', 'ImportRows', 'SaveSalesScript', 'ImportSalesScripts', 'FetchAlerts', 'SearchCapacity'])
})
