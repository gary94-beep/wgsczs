import { isMock, postHandle2 } from './client'
import { mockFetchDashboard, mockFetchPermission, mockImportTargets, mockImportCapacity } from './mock'

const custome_biz_code = import.meta.env.VITE_CUSTOME_SERVICE_CODE

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
  if (isMock) return mockImportTargets(rows, permission)
  return postHandle2(SERVICE_IDS.importTargets, { rows }, { token })
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