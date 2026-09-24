const isMock = import.meta.env.VITE_USE_MOCK === 'true'
const apiBase = import.meta.env.VITE_API_BASE || ''

function reqSeq() {
  return `${Date.now()}${Math.random().toString(36).slice(2, 8)}`
}

function reqTime() {
  const d = new Date()
  const pad = value => String(value).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export function buildHandle2Payload(serviceId, data, options = {}) {
  return {
    publicData: {
      reqTime: reqTime(),
      reqSeq: reqSeq(),
      appid: import.meta.env.VITE_APP_ID || options.appid || '',
      activityId: import.meta.env.VITE_ACTIVITY_ID || options.activityId || '',
      serviceId,
      version: import.meta.env.VITE_API_VERSION || '2.0',
      isTest: options.isTest ?? '1'
    },
    interfaceData: {
      data
    }
  }
}

export async function postHandle2(serviceId, data, options = {}) {
  if (isMock) {
    throw new Error('Mock mode should call mock service directly.')
  }

  const response = await fetch(apiBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { token: options.token } : {})
    },
    body: JSON.stringify(buildHandle2Payload(serviceId, data, options))
  })

  if (!response.ok) {
    throw new Error(`接口请求失败：${response.status}`)
  }

  const json = await response.json()

  if (json?.result) {
    const { retCode, retMsg, data: resultData } = json.result
    if (retCode !== '0') throw new Error(retMsg || '接口返回失败')
    return resultData
  }

  if (json?.success === false) {
    throw new Error(json.message || '接口返回失败')
  }

  return json?.data ?? json
}

export { isMock }
