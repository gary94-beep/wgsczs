import { isMock, postHandle2 } from './client'
import { mockFetchDashboard, mockFetchPermission, mockImportTargets } from './mock'

const SERVICE_IDS = {
  getPermission: 'grid_ai_get_permission',
  getDashboard: 'grid_ai_get_dashboard',
  importTargets: 'grid_ai_import_targets'
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
