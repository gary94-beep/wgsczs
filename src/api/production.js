import { isMock, postHandle2 } from './client.js'
import { mockFetchChangeAlerts } from './mock.js'
import { mockFetchAiAnalysis } from './mock.js'
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
export async function fetchSession(token) {
  return isMock ? { permission: await mockFetchPermission('13800000009') } : gateway('biz', 'wgsc_fetchSession', {}, token)
}
export async function fetchChannelOptions(params, token) {
  if (isMock) {
    const data = await mockFetchDashboard(params)
    const ids = new Set(params.gridIds || [])
    const rows = params.period === 'day' ? data.dailyRows : data.rows
    return { channels: [...new Set(rows.filter(row => (!ids.size || ids.has(row.gridId)) && row.productId === params.productId).map(row => row.channel).filter(Boolean))] }
  }
  return gateway('biz', 'wgsc_fetchChannelOptions', { ...params, gridIds: JSON.stringify(params.gridIds || []) }, token)
}
// Only matching, already aggregated records are downloaded. Paging also keeps
// exports complete; no source-table data is loaded for client-side calculation.
async function matchingPages(funCode, params, token) {
  let result = null
  for (let page = 1; ; page++) {
    const data = await gateway('biz', funCode, { ...params, page, pageSize: 500 }, token)
    if (!result) result = { ...data, people: [], channels: [], results: [] }
    if (data.statDate !== result.statDate) throw new Error('翻页期间数据日期已变化，请重新查询')
    if (result.pagination?.total !== data.pagination?.total) throw new Error('翻页期间匹配数量已变化，请重新查询')
    result.people.push(...(data.people || []))
    result.channels.push(...(data.channels || []))
    result.results.push(...(data.results || []))
    result.pagination = data.pagination
    if (!data.pagination?.hasMore) return result
    if (data.pagination.page !== page || !(data.people?.length || data.channels?.length || data.results?.length)) throw new Error('网关分页响应异常，请重新查询')
    if (page >= 2000) throw new Error('匹配记录过多，请缩小查询范围')
  }
}
export async function fetchAlerts(params, token) {
  return isMock ? mockFetchAlerts(params) : matchingPages('wgsc_fetchAlerts', { ...params, gridIds: JSON.stringify(params.gridIds || []) }, token)
}
export async function queryCapacity(params, token) {
  return isMock ? mockSearchCapacity(params) : matchingPages('wgsc_searchCapacity', { ...params, gridIds: JSON.stringify(params.gridIds || []) }, token)
}
export async function fetchChangeAlerts(params, token) {
  return isMock ? mockFetchChangeAlerts(params) : matchingPages('wgsc_fetchChangeAlerts', { ...params, gridIds: JSON.stringify(params.gridIds || []) }, token)
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

// ============================================================
// AI 分析结果读取
// ============================================================
export async function fetchAiAnalysis(params, token) {
  if (isMock) return mockFetchAiAnalysis(params)
  return gateway('ai', 'wgsc_aiGetAnalysisResult', {
    statDate: params.statDate || '',
    scopeType: params.scopeType || '',
    scopeId: params.scopeId || '',
    channelType: params.channelType || ''
  }, token)
}
