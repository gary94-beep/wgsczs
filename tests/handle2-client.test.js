import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/api/client.js', import.meta.url), 'utf8')
  .replaceAll('import.meta.env', 'env').replace(/export (async function|function)/g, '$1').replace('export { isMock }', '')
function client(business, { http = true, gatewayCode = '0' } = {}) {
  let sent, event
  const env = { VITE_API_BASE: '/handle2-api', VITE_APP_ID: 'app', VITE_ACTIVITY_ID: 'activity', VITE_API_VERSION: '1.0', VITE_IS_TEST: '1' }
  const context = { env, console, AbortSignal, Event,
    window: { crypto: globalThis.crypto, JSEncrypt: class { setPublicKey() {} encrypt() { return 'RSA' } }, encryptAES: s => s, decryptAES: () => JSON.stringify(business), dispatchEvent: e => { event = e.type } },
    document: { querySelector: () => ({ dataset: { loaded: 'true' } }) },
    fetch: async (url, options) => { sent = JSON.parse(options.body); return { ok: http, status: 503, json: async () => ({ publicData: { retInfo: { retCode: gatewayCode } }, data: 'AES' }) } }
  }
  vm.createContext(context); vm.runInContext(source, context)
  return { context, sent: () => sent, event: () => event }
}
test('Handle2 decrypts numeric/string success and preserves the double result envelope', async () => {
  for (const retCode of [0, '0']) {
    const c = client({ result: { result: { retCode, data: { total: 4 } } } })
    const result = await c.context.postHandle2('ability_customize', { servicecode: 'BIZ', token: 'T', params: { funCode: 'wgsc_fetchDashboard' } })
    assert.equal(result.total, 4)
    const envelope = JSON.parse(c.sent().data)
    assert.equal(envelope.publicData.serviceId, 'ability_customize')
    assert.equal(envelope.data.servicecode, 'BIZ')
    assert.equal(envelope.data.token, 'T')
    assert.equal(c.sent().key, 'RSA')
  }
})

test('authentication uses encrypted mobile and its own response shape and versions', async () => {
  const c = client({ status: '0', token: 'SMS_TOKEN' })
  const result = await c.context.postHandle2('ability_acquire_valid_code', { mobile: '13800000001', code: '123456' }, { version: '2.0', encryptMobile: true, responseType: 'auth' })
  assert.equal(result.token, 'SMS_TOKEN')
  const payload = JSON.parse(c.sent().data)
  assert.equal(payload.data.mobile, 'RSA')
  assert.equal(payload.data.code, '123456')
  assert.equal(payload.publicData.version, '2.0')
  assert.equal(payload.publicData.serviceId, 'ability_acquire_valid_code')
  await c.context.postHandle2('ability_acquire_login', { msgidKey: 'MSG' }, { version: '1.0', responseType: 'auth' })
  assert.equal(JSON.parse(c.sent().data).publicData.version, '1.0')
})
test('HTTP, gateway and expired-token failures are explicit without logging decrypted content', async () => {
  await assert.rejects(client({}, { http: false }).context.postHandle2('S', {}), /503/)
  await assert.rejects(client({}, { gatewayCode: '9' }).context.postHandle2('S', {}), /网关/)
  const c = client({ result: { result: { retCode: '00008', retMsg: 'expired' } } })
  await assert.rejects(c.context.postHandle2('S', {}), /expired/)
  assert.equal(c.event(), 'handle2-auth-expired')
  assert.ok(!source.includes("console.log('bizData'"))
})
