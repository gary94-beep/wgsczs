const columns = ['name', 'phone', 'role', 'branch', 'grid', 'super_admin', 'enabled']

const roles = {
  '1': 'city', '2': 'branch', '3': 'grid',
  市公司: 'city', 分公司: 'branch', 网格: 'grid', 网格长: 'grid',
  city: 'city', branch: 'branch', grid: 'grid'
}

export function permissionRows(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('文件内容为空')

  const headers = (data[0] || []).map(value => String(value || '').trim())
  const missing = columns.filter(col => !headers.includes(col))
  if (missing.length) throw new Error(`权限表须包含：${missing.join('、')}`)

  const seen = new Set()
  const result = []

  for (let i = 1; i < data.length; i++) {
    const row = {}
    columns.forEach(col => {
      row[col] = String(data[i][headers.indexOf(col)] ?? '').trim()
    })

    if (!row.name && !row.phone) continue
    if (row.name.startsWith('必填') || row.name.startsWith('示例') || row.phone === '必填' || row.phone === '手机号') continue

    const record = {
      name: row.name,
      phone: row.phone,
      role: roles[row.role] || row.role,
      branch: row.branch,
      grid: row.grid,
      is_super_admin: row.super_admin,
      enabled: row.enabled
    }

    if (!record.name || !/^1\d{10}$/.test(record.phone) || ['city', 'branch', 'grid'].indexOf(record.role) < 0 ||
        !/^[01]$/.test(record.is_super_admin) || !/^[01]$/.test(record.enabled) || seen.has(record.phone)) {
      throw new Error(`第${i + 1}行姓名、手机号、权限标志无效或重复`)
    }

    if ((record.role === 'city' && (record.branch || record.grid)) ||
        (record.role !== 'city' && !record.branch) ||
        (record.role === 'branch' && record.grid) ||
        (record.role === 'grid' && !record.grid)) {
      throw new Error(`第${i + 1}行权限与组织范围不一致`)
    }

    seen.add(record.phone)
    result.push(record)
  }

  if (!result.length) throw new Error('请至少填写一名人员的姓名和手机号')
  return result
}

export function permissionTemplateCsv() {
  const header = 'id,name,phone,role,branch,grid,super_admin,enabled,updated_at'
  const sample = '必填（导入时请删除示例行）,必填,必填,必填（1市公司，2分公司，3网格）,选填,选填,选填,选填,选填'
  return '\ufeff' + [header, sample].join('\r\n')
}