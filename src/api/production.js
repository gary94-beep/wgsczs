import { isMock, postHandle2 } from './client.js'
import { mockFetchChangeAlerts } from './mock.js'
import { mockFetchDashboard, mockFetchPermission, mockGetMobileByToken, mockFetchAlerts, mockSearchCapacity, mockImportTargets, mockImportCapacity, mockImportRows, mockSaveSalesScript, mockImportSalesScripts } from './mock.js'

const codes = { common: import.meta.env.VITE_COMMON_SERVICE_CODE, biz: import.meta.env.VITE_BIZ_SERVICE_CODE, ai: import.meta.env.VITE_AI_SERVICE_CODE, test: import.meta.env.VITE_TEST_SERVICE_CODE }

function gateway(group, funCode, params, token, anonymous = false) {
  if (!codes[group]) throw new Error(`未配置${group === 'common' ? '通用' : group === 'ai' ? 'AI' : '业务'}网关servicecode`)
  if (!anonymous && !token) throw new Error('登录token缺失，请通过移动认证入口登录')
  return postHandle2('ability_customize', {
    servicecode: codes[group], token: token || '', params: { ...params, funCode, token: token || '' }
  }, group === 'ai' ? { timeoutMs: 65000 } : {})
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
export async function fetchChangeAlerts(params, token) {
  return isMock ? mockFetchChangeAlerts(params) : gateway('biz', 'wgsc_fetchChangeAlerts', { ...params, gridIds: JSON.stringify(params.gridIds || []) }, token)
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

export async function analyzeCapacity(params, token) {
  if (params.consent !== true) throw new Error('请先同意将汇总指标发送至MoMA分析')
  return gateway('ai', 'wgsc_analyze', { question: params.question, consent: '1', view: params.view, productId: params.productId || '', gridIds: JSON.stringify(params.gridIds || []), threshold: params.threshold ?? 1, period: params.period || 'month', channel: params.channel || '', channelType: params.channelType || '' }, token)
}

/**
 * 【临时测试】验证网关能否出网调 MoMA
 * 对应网关脚本 sczs_test_api.js
 * funCode 映射：echo → wgsc_aiTestEcho，moma_raw → wgsc_aiTestMomaRaw，moma_full → wgsc_aiTestMomaFull
 */
export async function testAiGateway(target, momaKey, token) {
  if (isMock) throw new Error('该测试只能在真实环境运行，isMock=true 时不适用')
  const funCodeMap = {
    echo: 'wgsc_aiTestEcho',
    moma_raw: 'wgsc_aiTestMomaRaw',
    moma_full: 'wgsc_aiTestMomaFull'
  }
  const funCode = funCodeMap[target]
  if (!funCode) throw new Error('target 须为 echo / moma_raw / moma_full')
  return gateway('test', funCode, { momaKey: momaKey || '' }, token)
}
