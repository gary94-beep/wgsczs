import { resolveHandle2References } from './handle2References.js'

const isMock = import.meta.env.VITE_USE_MOCK === 'true'
const apiBase = import.meta.env.VITE_API_BASE || ''
const appId = import.meta.env.VITE_APP_ID || ''
const activityId = import.meta.env.VITE_ACTIVITY_ID || ''
const isTest = import.meta.env.VITE_IS_TEST

/** 移动Handle2接口RSA公钥，用于加密AES密钥 */
const HANDLE2_RSA_PUBLIC_KEY = `-----BEGIN RSA PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs4VXnzCnGoOr0camO/kB/KC+cM57FoIHnAVyvUOLgLWTptP76hC/FD/yBjdVHMzcBazkJuTVKvhd5Y+31YNSR3wPjMwus9re7AQdj8DI5RnZdRjXtLfKxG/PC8MlJ98rkZYXg6vp1xyo3Oq9qXJ1ff9WJOAMSAS6dfkzA+qSumw1UzpX1duhAm8QhYAbEW24Leto55uuoUKnS5LXAN8qVe5uKLueb787xQm5NTj2M3eB0w//NTiKlV3g2JsGJv8H0vShQK0ez5bR73dxyrO0qY6Xr2ri6Dp2SHNEjdclohoANkNB649tUgadGId546Fvs0Ln0VzW909LCz4vxMKmsQIDAQAB
-----END RSA PUBLIC KEY-----`

/** 需要动态加载的外部加密脚本列表 */
const HANDLE2_CRYPTO_SCRIPTS = [
  'https://gd.10086.cn/apph5/openapi/static/js/jsencrypt-master/jsencrypt.min.js',
  'https://gd.10086.cn/apph5/openapi/static/js/aes/crypto-min.js',
  'https://gd.10086.cn/apph5/openapi/static/js/aes/aesUtils.js'
]

/** 加密组件加载状态的Promise缓存 */
let handle2CryptoReady

/**
 * 生成请求时间字符串（格式：YYYYMMDDHHmmSS）
 * @returns {string} 14位时间字符串
 */
function reqTime() {
  const now = new Date()
  const pad = value => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

/**
 * 生成请求序列号（YYYYMMDDHHmmSS + 17位随机字母数字）
 * @returns {string} 唯一序列号
 */
function reqSeq() {
  const now = new Date()
  const pad = value => String(value).padStart(2, '0')
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 17; i += 1) {
    suffix += letters[Math.floor(Math.random() * letters.length)]
  }
  return `${datePart}${suffix}`
}

/**
 * 生成16位随机AES密钥
 * @returns {string} 16位随机字符串
 */
function createAesKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const random = new Uint32Array(16)
  window.crypto.getRandomValues(random)
  return Array.from(random, value => chars[value % chars.length]).join('')
}

/**
 * 使用RSA公钥加密数据
 * @param {string} value - 待加密的明文
 * @param {string} publicKey - RSA公钥字符串
 * @returns {string} RSA加密后的密文
 */
function rsaEncrypt(value, publicKey) {
  const encryptor = new window.JSEncrypt()
  encryptor.setPublicKey(publicKey)
  const encrypted = encryptor.encrypt(value)
  if (!encrypted) throw new Error('RSA 加密失败')
  return encrypted
}

/**
 * 使用AES加密请求载荷，并用RSA加密AES密钥
 * @param {Object} payload - 请求数据对象
 * @param {string} aesKey - AES密钥
 * @returns {Object} 包含加密后data和key的对象
 */
function encryptHandle2Payload(payload, aesKey) {
  if (typeof window.encryptAES !== 'function') {
    throw new Error('AES 加密组件不可用')
  }
  return {
    data: window.encryptAES(JSON.stringify(payload), aesKey),
    key: rsaEncrypt(aesKey, HANDLE2_RSA_PUBLIC_KEY)
  }
}

/**
 * 动态加载外部JavaScript脚本
 * @param {string} src - 脚本URL地址
 * @returns {Promise<void>} 加载完成的Promise
 */
export function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing?.dataset.loaded === 'true') { resolve(); return }
    const script = existing || document.createElement('script')
    let settled = false
    const finish = error => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      script.removeEventListener('load', loaded)
      script.removeEventListener('error', failed)
      if (error) reject(error)
      else resolve()
    }
    const loaded = () => {
      script.dataset.loaded = 'true'
      finish()
    }
    const failed = () => { if (!existing) script.remove(); finish(new Error('登录组件加载失败，请检查公司网络或VPN连接后重试')) }
    const timer = setTimeout(() => { if (!existing) script.remove(); finish(new Error('登录组件加载超时，请检查公司网络后重试')) }, 15000)
    script.addEventListener('load', loaded, { once: true })
    script.addEventListener('error', failed, { once: true })
    if (!existing) { script.src = src; script.async = false; document.head.appendChild(script) }
  })
}

/**
 * 确保所有加密组件脚本已加载完成
 * @returns {Promise<void>} 全部加载完成的Promise
 */
function ensureHandle2Crypto() {
  if (!handle2CryptoReady) {
    handle2CryptoReady = HANDLE2_CRYPTO_SCRIPTS.reduce(
      (promise, src) => promise.then(() => loadExternalScript(src)),
      Promise.resolve()
    ).then(() => {
      if (typeof window.JSEncrypt !== 'function') throw new Error('RSA 加密组件不可用')
      if (typeof window.encryptAES !== 'function' || typeof window.decryptAES !== 'function') {
        throw new Error('AES 加密组件不可用')
      }
    }).catch(error => { handle2CryptoReady = undefined; throw error })
  }
  return handle2CryptoReady
}

/**
 * 组装完整 payload 并加密
 * @param {string} serviceId - 网关服务标识
 * @param {Object} data - 业务数据
 * @param {Object} options - 可选参数
 * @returns {Promise<{aesKey:string, body:Object}>} aesKey 与加密后的请求体
 */
export async function buildHandle2Payload(serviceId, data, options = {}) {
  await ensureHandle2Crypto()
  const aesKey = createAesKey()
  const body = encryptHandle2Payload({
    publicData: {
      reqTime: reqTime(),
      reqSeq: reqSeq(),
      appid: options.appId || appId || '',
      activityId: options.activityId || activityId || '',
      serviceId,
      version: options.version || import.meta.env.VITE_API_VERSION || '1.0',
      isTest: options.isTest ?? isTest
    },
    data
  }, aesKey)
  return { aesKey, body }
}

/**
 * 解密 resultData，按 xysct.vue 标准结构取值
 * 结构：{ result: { result: { retCode, retMsg, data } } }
 * @param {*} resultData - 网关返回的加密数据
 * @param {string} aesKey - 本次请求的 AES 密钥
 * @returns {*} 业务 data（bizData.result.result.data）
 */
export function decryptAndUnwrap(resultData, aesKey, options = {}) {
  if (!resultData || typeof window.decryptAES !== 'function') {
    throw new Error('返回数据异常，无法解密')
  }

  const decryptedJson = window.decryptAES(resultData, aesKey)
  const bizData = resolveHandle2References(JSON.parse(decryptedJson))

  // 两层 result
  const business = bizData?.result?.result
  if (!business || String(business.retCode) !== '0') {
    const error = new Error(business?.retMsg || '业务处理失败')
    error.code = String(business?.retCode || '')
    if (['00008','600100001','600100002','600100003'].includes(error.code) && options.dispatchAuthExpired !== false) {
      const event=new Event('handle2-auth-expired');event.requestToken=options.requestToken;window.dispatchEvent(event)
    }
    throw error
  }

  return bizData?.result?.result?.data
}

/**
 * 统一请求入口：加密发送 → 网关校验 → AES 解密 → 业务校验 → 返回业务 data
 * @param {string} serviceId - 网关服务标识
 * @param {Object} data - 业务数据
 * @param {Object} options - 可选参数
 * @returns {Promise<*>} 业务 data
 */
export async function postHandle2(serviceId, data, options = {}) {
  if (!apiBase || !appId || !activityId) throw new Error('Handle2地址、APP_ID或ACTIVITY_ID未配置')
  if (options.encryptMobile) {
    await ensureHandle2Crypto()
    data = { ...data, mobile: rsaEncrypt(data.mobile, HANDLE2_RSA_PUBLIC_KEY) }
  }
  const { aesKey, body } = await buildHandle2Payload(serviceId, data, options)

  let response
  try { response = await fetch(apiBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(body),
    signal: options.signal || AbortSignal.timeout(options.timeoutMs || 60000)
  }) } catch (error) {
    if (options.signal?.aborted) throw error
    if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new Error('公司接口请求超时，尚未确认处理结果；已有验证码可直接尝试登录')
    throw new Error('未能连接公司接口，请检查公司网络或VPN连接后重试')
  }

  if (!response.ok) {
    throw new Error([502,503,504].includes(response.status) ? `公司接口或本地代理暂时不可用（${response.status}），已有验证码可直接尝试登录` : `接口请求失败：${response.status}`)
  }

  const json = await response.json()

  const retInfo = json?.publicData?.retInfo
  if (!retInfo || String(retInfo.retCode) !== '0') {
    const error=new Error(retInfo?.retMsg || '网关请求失败');error.code=String(retInfo?.retCode || '')
    if(['600100001','600100002','600100003'].includes(error.code) && options.dispatchAuthExpired !== false){const event=new Event('handle2-auth-expired');event.requestToken=data.token;window.dispatchEvent(event)}
    throw error
  }
  if (options.responseType === 'sendCode' && !json.data) return null
  if (!json.data) {
    throw new Error('返回数据异常，无法解密')
  }

  if (options.responseType === 'auth' || options.responseType === 'sendCode') {
    let result = window.decryptAES(json.data, aesKey)
    for (let i = 0; i < 6 && typeof result === 'string'; i++) result = JSON.parse(result)
    return result
  }
  return decryptAndUnwrap(json.data, aesKey, {...options,requestToken:data.token})
}

export { isMock }
