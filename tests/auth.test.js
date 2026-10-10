import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/api/auth.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/export (async function|function)/g, '$1')
function auth({ mock = false, result = { status: '0', token: 'TOKEN' }, permission = { role: 'city' }, sdkError = false } = {}) {
  const calls = []
  const context = {
    isMock: mock, setTimeout, clearTimeout,
    fetchPermission: async phone => { calls.push({ permission: phone }); return permission },
    getMobileByToken: async token => { calls.push({ mobileToken: token }); return { mobile: '13800000001' } },
    loadExternalScript: async src => calls.push({ script: src }),
    window: { Login: { login: (ok, fail) => sdkError ? fail({ msg: 'SDK failed' }) : ok({ data: { msgidKey: 'MSG' } }) } },
    postHandle2: async (serviceId, data, options) => { calls.push({ serviceId, data, options }); return result }
  }
  vm.createContext(context); vm.runInContext(source, context)
  return { context, calls }
}
test('SMS checks permission then calls encrypted version 2 send/verify services', async () => {
  const a = auth()
  await a.context.sendLoginCode('13800000001')
  assert.equal(a.calls[0].permission, '13800000001')
  assert.equal(a.calls[1].serviceId, 'ability_acquire_send_code')
  assert.equal(a.calls[1].options.encryptMobile, true)
  const identity = await a.context.loginWithCode('13800000001', '123456')
  assert.equal(identity.token, 'TOKEN')
  assert.equal(a.calls.at(-1).serviceId, 'ability_acquire_valid_code')
  await assert.rejects(auth({ permission: null }).context.sendLoginCode('13800000001'), /权限/)
  await assert.rejects(a.context.loginWithCode('13800000001', '1'), /6位/)
})
test('authentication rejects failed, malformed and tokenless responses', async () => {
  for (const result of [{ status: '1', msg: 'wrong code' }, { status: '0' }, { token: 'T' }, { result: { result: { retCode: '9', retMsg: 'denied' } } }]) {
    await assert.rejects(auth({ result }).context.loginWithCode('13800000001', '123456'))
  }
  await assert.rejects(auth({ result: { status: '1', msg: 'SMS failed' } }).context.sendLoginCode('13800000001'), /SMS failed/)
})
test('one-click SDK credentials are exchanged for token and masked phone is resolved', async () => {
  const a = auth({ result: { result: JSON.stringify({ retCode: '0', data: { token: 'ONE_TOKEN', mobile: '138****0001' } }) } })
  const identity = await a.context.loginWithOneClick()
  assert.equal(identity.mobile, '13800000001')
  assert.equal(identity.token, 'ONE_TOKEN')
  const request = a.calls.find(call => call.serviceId)
  assert.equal(request.serviceId, 'ability_acquire_login')
  assert.equal(request.options.version, '1.0')
  assert.equal(request.data.msgidKey, 'MSG')
  assert.equal(a.calls.filter(call => call.script).length, 3)
  await assert.rejects(auth({ sdkError: true }).context.loginWithOneClick(), /SDK failed/)
  await assert.rejects(auth({ result: { retCode: '0', mobile: '13800000001' } }).context.loginWithOneClick(), /token/)
})
test('mock login never sends authentication requests and checks demo code', async () => {
  const a = auth({ mock: true })
  await a.context.sendLoginCode('13800000001')
  assert.equal((await a.context.loginWithCode('13800000001', '123456')).token, 'mock-token')
  await assert.rejects(a.context.loginWithCode('13800000001', '654321'), /模拟验证码/)
  assert.equal((await a.context.loginWithOneClick()).mobile, '13800000000')
  assert.ok(!a.calls.some(call => call.serviceId || call.script))
})
