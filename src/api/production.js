import { isMock, postHandle2 } from './client.js'
import { mockFetchDashboard, mockFetchPermission, mockGetMobileByToken, mockFetchAlerts, mockSearchCapacity, mockImportTargets, mockImportCapacity, mockImportRows, mockSaveSalesScript, mockImportSalesScripts } from './mock.js'

const codes = { common: import.meta.env.VITE_COMMON_SERVICE_CODE, biz: import.meta.env.VITE_BIZ_SERVICE_CODE }

function gateway(group, funCode, params, token, anonymous = false) {
  if (!codes[group]) throw new Error(`未配置${group === 'common' ? '通用' : '业务'}网关servicecode`)
  if (!anonymous && !token) throw new Error('登录token缺失，请通过移动认证入口登录')
  return postHandle2('ability_customize', {
    servicecode: codes[group], token: token || '', params: { ...params, funCode, token: token || '' }
  })
}

export async function fetchPermission(phone, token) {
  return isMock ? mockFetchPermission(phone) : gateway('common', 'wgsc_fetchPermission', { phone }, token, true)
}
export async function getMobileByToken(token) {
  return isMock ? mockGetMobileByToken(token) : gateway('common', 'wgsc_getMobileByToken', {}, token)
}
export async function fetchDashboard(params, token) {
  return isMock ? mockFetchDashboard(params) : gateway('biz', 'wgsc_fetchDashboard', {}, token)
}
export async function fetchAlerts(params, token) {
  return isMock ? mockFetchAlerts(params) : gateway('biz', 'wgsc_fetchAlerts', { ...params, gridIds: JSON.stringify(params.gridIds || []) }, token)
}
export async function queryCapacity(params, token) {
  return isMock ? mockSearchCapacity(params) : gateway('biz', 'wgsc_searchCapacity', { ...params, gridIds: JSON.stringify(params.gridIds || []) }, token)
}
function checkAdmin(permission) {
  if (permission?.isSuperAdmin !== true) throw new Error('仅超级管理员可导入或维护')
}
export async function importTargets(rows, permission, token) {
  checkAdmin(permission)
  return isMock ? mockImportTargets(rows, permission) : gateway('biz', 'wgsc_importTargets', { rows: JSON.stringify(rows) }, token)
}
export async function saveSalesScript(script, permission, token) {
  checkAdmin(permission)
  return isMock ? mockSaveSalesScript(script, permission) : gateway('biz', 'wgsc_saveSalesScript', { script: JSON.stringify(script) }, token)
}
export async function importSalesScripts(rows, permission, token) {
  checkAdmin(permission)
  return isMock ? mockImportSalesScripts(rows, permission) : gateway('biz', 'wgsc_importSalesScripts', { rows: JSON.stringify(rows) }, token)
}
export async function importCapacity(target, rows, token) {
  return isMock ? mockImportCapacity(target, rows) : gateway('biz', 'wgsc_importCapacity', { target, rows: JSON.stringify(rows) }, token)
}
export async function importRows(target, rows, token, permission) {
  if (target === 'permission') checkAdmin(permission)
  return isMock ? mockImportRows(target, rows, permission) : gateway('biz', 'wgsc_importRows', { target, rows: JSON.stringify(rows) }, token)
}
