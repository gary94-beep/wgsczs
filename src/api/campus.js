import { isMock, postHandle2 } from './client.js'
import { fetchDashboard } from './production.js'
import { getMockCampusData } from '../data/mockCampusData.js'
import { normalizeCampusDorms } from '../utils/campusAnalysis.js'

// Public identifiers copied from xysct_v1.12; all access still requires campus authorization.
const servicecode = import.meta.env.VITE_CAMPUS_SERVICE_CODE || 'Fcbfd3d8cf170a25'
const options = {
  appId: import.meta.env.VITE_CAMPUS_APP_ID || 'cx5f6703315a2541b6',
  activityId: import.meta.env.VITE_CAMPUS_ACTIVITY_ID || 'xysct',
  isTest: Number(import.meta.env.VITE_CAMPUS_IS_TEST || 0), dispatchAuthExpired: false
}
export async function fetchCampusAnalysis({ phone, token, signal }) {
  if (!/^1\d{10}$/.test(phone || '') || !token) throw new Error('请先登录网格生产AI助手')
  if (isMock) {
    const demo = getMockCampusData(phone)
    return { ...demo, dorms: normalizeCampusDorms(demo.dorms) }
  }
  // The business gateway authenticates SMS tokens via its server session. The
  // campus getMobileByToken endpoint is a one-click-login exchange, not this session.
  const identity = (await fetchDashboard({}, token)).permission
  const mobile = String(identity?.phone || '').trim()
  if (!/^1\d{10}$/.test(mobile)) throw new Error('网格业务接口未返回已认证手机号，请重新登录或联系管理员核对网关版本')
  if (mobile !== phone) throw new Error('校园认证身份与当前登录账号不一致，请重新登录后重试')
  const request = (funCode, params = {}) => postHandle2('ability_customize', { servicecode, token, params: { ...params, funCode, token } }, { ...options, signal })
  try {
    const permission = await request('xysct_fetchPermission', { phone: mobile })
    if (!['1', '9'].includes(String(permission?.role)) || [0, '0', false].includes(permission?.enabled) || (permission?.phone && String(permission.phone).trim() !== mobile)) throw new Error('暂无校园生产分析权限，请联系校园生产通管理员')
    const dorms = normalizeCampusDorms(await request('xysct_getDorms'))
    return { permission: { role: Number(permission.role) }, dorms, demo: false }
  } catch (error) {
    if (error.code === '00008') throw new Error('校园接口未接受当前登录凭证，请确认校园与网格应用的认证互通；网格登录仍然有效')
    throw error
  }
}
