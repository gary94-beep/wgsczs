export function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = '' }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = '' }
    else cell += char
  }
  if (quoted) throw new Error('CSV 引号未闭合')
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row)
  return rows
}

export function findHeaderRow(data) {
  const header = data.findIndex(row => {
    const set = new Set(row.map(cell => String(cell || '').trim()))
    const isBizTable = set.has('branch_company') && set.has('grid_name') && set.has('prod_period_type') && set.has('product_name')
    const isChannelInfoTable = set.has('uni_code') && set.has('chn_code') && set.has('chn_name')
    const isDimensionTable = set.has('staff_no') && set.has('branch') && set.has('grid')
    const isPermissionTable = set.has('name') && set.has('phone') && set.has('role')
    return isBizTable || isChannelInfoTable || isDimensionTable || isPermissionTable
  })
  if (header < 0) throw new Error('没有找到有效表头')
  return data.slice(header).filter(row => !String(row[0] || '').startsWith('仅供联调'))
}

export async function parseExcelFile(file, sheetHint = '') {
  const name = file.name || ''
  if (/\.csv$/i.test(name)) {
    const text = (await file.text()).replace(/^\ufeff/, '')
    return findHeaderRow(parseCsv(text))
  }
  await ensureXlsx()
  if (typeof window.XLSX === 'undefined') throw new Error('Excel 解析组件未加载')
  const buffer = await file.arrayBuffer()
  const workbook = window.XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames.includes(sheetHint) ? sheetHint : workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return findHeaderRow(window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }))
}

export function ensureXlsx() {
  if (window.XLSX) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve()
      else {
        existing.addEventListener('load', resolve, { once: true })
        existing.addEventListener('error', () => reject(new Error('SheetJS 加载失败')), { once: true })
      }
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.onload = () => { script.dataset.loaded = 'true'; resolve() }
    script.onerror = () => reject(new Error('SheetJS 加载失败'))
    document.head.appendChild(script)
  })
}

export function requireColumns(header, required) {
  const missing = required.filter(col => !header.includes(col))
  if (missing.length) throw new Error(`缺少列：${missing.join('、')}`)
}

const PERIOD_TYPE_MAP = {
  '月产能（mon）': 'mon', '日产能（day）': 'day', '7天产能（week）': 'week', '上月同期产能（last mon）': 'last_mon',
  mon: 'mon', day: 'day', week: 'week', last_mon: 'last_mon', 'last mon': 'last_mon'
}
export function normalizePeriodType(value) {
  return PERIOD_TYPE_MAP[String(value || '').trim()] || String(value || '').trim()
}
export function normalizeStatDate(value) {
  const s = String(value || '').trim()
  if (!s) return ''
  const m = s.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return s
}
export function normalizeSnapshotTime(value) {
  const s = String(value || '').trim()
  if (!s) return ''
  const m = s.match(/^(\d{4})(\d{2})(\d{2})\s+(\d{2})(\d{2})(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`
  return s
}
export function normalizeCapacityRows(rows) {
  return rows.map(r => ({
    ...r,
    prod_period_type: normalizePeriodType(r.prod_period_type),
    stat_date: normalizeStatDate(r.stat_date),
    snapshot_time: normalizeSnapshotTime(r.snapshot_time)
  }))
}

const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
export function parseStarLevel(text) {
  const s = String(text || '').trim()
  if (!s) return 0
  const ar = s.match(/(\d+)\s*星/)
  if (ar) return Number(ar[1])
  const cn = s.match(/([一二三四五六七八九十])\s*星/)
  if (cn) return CN_NUM[cn[1]] || 0
  return 0
}
export function normalizeStar(text) {
  return parseStarLevel(text) >= 3 ? '三星+' : '非三星+'
}

export function downloadCsv(csv, filename) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}