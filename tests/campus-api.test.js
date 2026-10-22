import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { normalizeCampusDorms } from '../src/utils/campusAnalysis.js'
import { getMockCampusData } from '../src/data/mockCampusData.js'

const source = readFileSync(new URL('../src/api/campus.js', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replaceAll('import.meta.env', 'env').replace('export async function', 'async function')
function client({ role = 1, mobile = '13800000009', permissionPhone, fail, demo = false, enabled = 1, missingIdentity = false } = {}) {
  const calls = []
  const ctx = { env: {}, isMock: demo, normalizeCampusDorms, getMockCampusData,
    fetchDashboard: async (params, token) => {
      calls.push({ gridIdentity: true, token })
      if (fail === 'gridIdentity') throw new Error('grid authentication failed')
      return missingIdentity ? {} : { permission: { phone: mobile } }
    },
    postHandle2: async (service, body, options) => {
    calls.push({ service, body, options })
    const fun = body.params.funCode
    if (fail === fun) { const e = new Error('expired'); e.code = '00008'; throw e }
    if (fun === 'xysct_fetchPermission') return { role, enabled, phone: permissionPhone || mobile }
    if (fun === 'xysct_getDorms') return getMockCampusData('13800000009').dorms
    throw new Error('Unexpected method')
  } }
  vm.runInNewContext(source, ctx)
  return { calls, request: params => ctx.fetchCampusAnalysis({ phone: '13800000009', token: 'GRID_TOKEN', ...params }) }
}
test('campus uses its existing activity and service, authenticates identity and permission before any dorm read', async () => {
  const c = client(), result = await c.request()
  assert.equal(result.dorms.length, 7)
  assert.equal(c.calls[0].gridIdentity, true)
  assert.equal(c.calls[0].token, 'GRID_TOKEN')
  const campus = c.calls.filter(c => !c.gridIdentity)
  assert.deepEqual(campus.map(c => c.body.params.funCode), ['xysct_fetchPermission', 'xysct_getDorms'])
  assert.ok(campus.every(c => c.service === 'ability_customize' && c.body.servicecode === 'Fcbfd3d8cf170a25' && c.body.token === 'GRID_TOKEN' && c.options.activityId === 'xysct' && c.options.dispatchAuthExpired === false))
})
test('registration-only, disabled, mismatched or missing identity cannot fetch campus dorms', async () => {
  for (const options of [{ role: 'register' }, { role: 2 }, { role: true }, { enabled: 0 }, { enabled: false }, { mobile: '13800000001' }, { permissionPhone: '13800000001' }, { missingIdentity: true }]) {
    const c = client(options)
    await assert.rejects(c.request())
    assert.ok(!c.calls.some(c => c.body?.params.funCode === 'xysct_getDorms'))
  }
  const c = client()
  await assert.rejects(c.request({ token: '' }), /登录/)
  assert.equal(c.calls.length, 0)
})
test('cross-application auth failure is explicit; mocks make no real requests; no mutation routes exist', async () => {
  await assert.rejects(client({ fail: 'xysct_fetchPermission' }).request(), /认证互通/)
  const invalidGrid = client({ fail: 'gridIdentity' })
  await assert.rejects(invalidGrid.request(), /grid authentication failed/)
  assert.equal(invalidGrid.calls.length, 1)
  const c = client({ demo: true })
  assert.equal((await c.request()).demo, true)
  assert.equal(c.calls.length, 0)
  assert.ok(!/request\('xysct_getMobileByToken'/.test(source))
  assert.ok(!/xysct_saveRecord|xysct_importUsers|xysct_importDorms/.test(source))
})

test('SMS session tokens do not require any one-click mobile exchange', async () => {
  const c = client()
  await c.request({ token: 'SMS_SESSION_TOKEN' })
  assert.equal(c.calls[0].token, 'SMS_SESSION_TOKEN')
  assert.ok(c.calls.filter(call => !call.gridIdentity).every(call => call.body.params.token === 'SMS_SESSION_TOKEN'))
  const mismatch = client({ mobile: '13800000001' })
  await assert.rejects(mismatch.request(), /不一致/)
  assert.equal(mismatch.calls.length, 1)
})
