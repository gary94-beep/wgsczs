import { isMock, postHandle2, loadExternalScript } from './client.js'
import { fetchPermission, getMobileByToken } from './production.js'

const sdkScripts = [
  'https://gd.10086.cn/apph5/openapi/static/js/jquery.min.js',
  'https://gd.10086.cn/apph5/openapi/static/js/acquire/acquire_min.js',
  'https://gd.10086.cn/apph5/openapi/static/js/acquire/ydrz_min.js'
]
let sdkReady
function parse(value) {
  for (let i = 0; i < 6 && typeof value === 'string'; i++) {
    try { value = JSON.parse(value) } catch { break }
  }
  return value
}
// Authentication responses differ from the custom gateway's two-result envelope.
export function checkAuthResult(value, required = true) {
  let node = parse(value), found = false
  for (let i = 0; i < 8 && node && typeof node === 'object'; i++) {
    const code = node.status ?? node.retCode ?? node.code
    if (code !== undefined) {
      found = true
      if (String(code) !== '0') throw new Error(node.msg || node.retMsg || node.message || '认证失败')
    }
    node = parse(node.result)
  }
  if (required && !found) throw new Error('认证返回缺少成功状态')
}
export function findAuthValue(value, keys) {
  const queue = [value], seen = new Set()
  for (let i = 0; i < queue.length && i < 1000; i++) {
    const node = parse(queue[i])
    if (!node || typeof node !== 'object' || seen.has(node)) continue
    seen.add(node)
    for (const key of keys) if (typeof node[key] === 'string' && node[key].trim()) return node[key].trim()
    queue.push(...Object.values(node))
  }
  return ''
}
export async function sendLoginCode(phone) {
  if (!/^1\d{10}$/.test(phone)) throw new Error('请输入正确的11位手机号')
  const permission = await fetchPermission(phone)
  if (!permission?.role) throw new Error('该手机号暂无使用权限')
  if (isMock) return
  const result = await postHandle2('ability_acquire_send_code', { mobile: phone }, { version: '2.0', encryptMobile: true, responseType: 'sendCode' })
  if (result !== null) checkAuthResult(result, false)
}
export async function loginWithCode(phone, code) {
  if (!/^1\d{10}$/.test(phone) || !/^\d{6}$/.test(code)) throw new Error('请输入正确的手机号和6位验证码')
  if (isMock) {
    if (code !== '123456') throw new Error('模拟验证码为123456')
    return { mobile: phone, token: 'mock-token' }
  }
  const result = await postHandle2('ability_acquire_valid_code', { mobile: phone, code }, { version: '2.0', encryptMobile: true, responseType: 'auth' })
  checkAuthResult(result)
  const token = findAuthValue(result, ['token', 'ssotoken', 'ssoToken', 'accessToken', 'accesstoken'])
  if (!token) throw new Error('认证成功但未返回登录token')
  return { mobile: phone, token }
}
async function getMsgidKey() {
  if (!sdkReady) sdkReady = sdkScripts.reduce((p, src) => p.then(() => loadExternalScript(src)), Promise.resolve())
    .then(() => { 
      // 检查 Richinfo.Acquire.init 是否存在
      if (typeof window.Richinfo?.YDRZ?.init !== 'function') {
        throw new Error('新版一键登录组件不可用') 
      }
    })
    .catch(error => { sdkReady = undefined; throw error })
    
  await sdkReady
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (error, value) => {
      if (settled) return
      settled = true; clearTimeout(timer)
      if (error) reject(new Error(typeof error === 'string' ? error : error.message || error.msg || '一键登录失败，请使用短信登录'))
      else resolve(value)
    }
    const timer = setTimeout(() => finish('一键登录取号超时，请使用短信登录'), 30000)
    
    try {
      // 使用 Richinfo.Acquire.init 初始化
      window.Richinfo.YDRZ.init(
        {}, // 初始化参数，一般传空对象即可
        (successRes) => {
          // 成功回调，successRes 应该就是 msgidKey
          const key = typeof successRes === 'string' ? successRes : (successRes?.msgidKey || successRes)
          key ? finish(null, key) : finish('未获取到一键登录授权凭据')
        },
        (error) => {
          // 失败回调
          finish(error || '一键登录授权失败')
        }
      )
    } catch (error) { finish(error) }
  })
}
export async function loginWithOneClick() {
  if (isMock) return { mobile: '13800000000', token: 'mock-token' }
  const msgidKey = await getMsgidKey()
  const result = await postHandle2('ability_acquire_login', { msgidKey }, { version: '1.0', responseType: 'auth' })
  checkAuthResult(result)
  const token = findAuthValue(result, ['token', 'ssotoken', 'ssoToken', 'accessToken', 'accesstoken'])
  if (!token) throw new Error('一键登录未返回登录token，请使用短信登录')
  let mobile = findAuthValue(result, ['mobile', 'phone', 'userphone', 'userPhone'])
  if (!/^1\d{10}$/.test(mobile)) mobile = (await getMobileByToken(token)).mobile
  if (!/^1\d{10}$/.test(mobile)) throw new Error('未获取到完整手机号，请使用短信登录')
  return { mobile, token }
}
