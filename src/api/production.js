import { isMock, postHandle2 } from './client'
import { mockFetchDashboard, mockFetchPermission, mockImportTargets, mockImportCapacity, mockImportRows } from './mock'

const custome_biz_code = import.meta.env.VITE_BIZ_SERVICE_CODE

const SERVICE_IDS = {
  getPermission: 'grid_ai_get_permission',
  getDashboard: 'grid_ai_get_dashboard',
  importTargets: 'grid_ai_import_targets',
  custom_biz: 'ability_customize'
}

const FUNC_CODE = {
  import_capacity: 'wgsc_importCapacity'
}

export async function fetchPermission(phone, token) {
  if (isMock) return mockFetchPermission(phone)
  return postHandle2(SERVICE_IDS.getPermission, { phone }, { token })
}

export async function fetchDashboard(params, token) {
  if (isMock) return mockFetchDashboard(params)
  return postHandle2(SERVICE_IDS.getDashboard, params, { token })
}

export async function importTargets(rows, permission, token) {
  if (permission?.isSuperAdmin !== true) throw new Error('仅超级管理员可导入目标')
  if (isMock) return mockImportTargets(rows, permission)
  return postHandle2(SERVICE_IDS.importTargets, { rows }, { token })
}

export async function saveSalesScript(script, permission, token) {
  if (isMock) return mockSaveSalesScript(script, permission)
  return postHandle2('grid_ai_save_sales_script', { script }, { token })
}

export async function importSalesScripts(rows, permission, token) {
  if (permission?.isSuperAdmin !== true) throw new Error('仅超级管理员可导入话术')
  if (isMock) return mockImportSalesScripts(rows, permission)
  return postHandle2('grid_ai_import_sales_scripts', { rows }, { token })
}

/**
 * 批量导入产能数据（区域/渠道/工号三张表通用）
 * @param {'region'|'channel'|'staff'} target - 目标表
 * @param {Object[]} rows - 行数据数组
 * @param {string} token - 登录 token
 * @returns {Promise<{total:number, success:number, failed:number, errors:string[]}>}
 */
export async function importCapacity(target, rows, token) {
  // if (isMock) return mockImportCapacity(target, rows)
  return postHandle2(SERVICE_IDS.custom_biz, {
    servicecode: custome_biz_code,
    token,
    params: {
      funCode: FUNC_CODE.import_capacity,
      token,
      target,
      rows: JSON.stringify(rows)
    }
  })
}

/**
 * 通用批量导入（渠道维度表 / 末梢表 / 员工表）
 * @param {'channelInfo'|'terminal'|'staff'} target
 * @param {Object[]} rows
 * @param {string} token
 * @returns {Promise<{total:number, success:number, failed:number, errors:string[]}>}
 */
export async function importRows(target, rows, token) {
  if (isMock) return mockImportRows(target, rows)
  return postHandle2(SERVICE_IDS.custom_biz, {
    servicecode: custome_biz_code,
    token,
    params: {
      funCode: 'wgsc_importRows',
      token,
      target,
      rows: JSON.stringify(rows)
    }
  })
}