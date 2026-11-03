function parse(value) {
  for (let i = 0; i < 3 && typeof value === 'string'; i++) {
    if (!value.trim()) return null
    try { value = JSON.parse(value) } catch { throw new Error('校园数据JSON格式无效') }
  }
  return value
}
const text = value => String(value ?? '').trim()
const rate = (value, total) => total ? Math.round(value / total * 100) : 0

export function normalizeCampusDorms(payload) {
  const data = parse(payload)
  const source = Array.isArray(data) ? data : [data?.list, data?.records, data?.rows, data?.data].find(Array.isArray)
  if (!source) throw new Error('校园接口未返回有效宿舍列表')
  if (source.length > 20000 || (Number.isInteger(data?.total) && data.total > source.length)) throw new Error('宿舍数据未完整返回或超过20000条，需要接口支持分页')
  const ids = new Set(), locations = new Set()
  let bedsTotal = 0
  return source.map(row => {
    const id = Number(row.id ?? row.roomId), beds = Number(row.beds)
    if (!Number.isSafeInteger(id) || id <= 0 || row.beds == null || text(row.beds) === '' || !Number.isSafeInteger(beds) || beds < 0) throw new Error('宿舍编号或床位数无效')
    const item = { id, school: text(row.school) || 'GY', college: text(row.college) || '无学院', building: text(row.building), floor: text(row.floor), room: text(row.room) }
    const location = JSON.stringify([item.school, item.college, item.building, item.floor, item.room])
    if (ids.has(id) || locations.has(location)) throw new Error('校园数据存在重复宿舍，请先核对源数据')
    ids.add(id); locations.add(location)
    bedsTotal += beds
    if (bedsTotal > 100000) throw new Error('床位超过100000个，请先按学校分页取数')
    function bedList(value) {
      const list = value == null || value === '' ? [] : parse(value)
      if (!Array.isArray(list)) throw new Error('床位记录格式无效')
      const numbers = list.map(Number)
      if (numbers.some(n => !Number.isSafeInteger(n) || n < 1 || n > beds)) throw new Error('触达或营销床号超出宿舍床位范围')
      return [...new Set(numbers)].sort((a, b) => a - b)
    }
    function owners(value) {
      const object = value == null || value === '' ? {} : parse(value)
      if (!object || typeof object !== 'object' || Array.isArray(object)) throw new Error('床位登记归属格式无效')
      return object
    }
    const reachedBeds = bedList(row.reachedBeds), marketedBeds = bedList(row.marketedBeds)
    if (marketedBeds.some(n => !reachedBeds.includes(n))) throw new Error('存在未触达却已营销的床位，请核对源数据')
    return { ...item, beds, reachedBeds, marketedBeds, reachedOwners: owners(row.reachedOwners), marketedOwners: owners(row.marketedOwners),
      remark: text(row.remark), remarkOwnerPhone: text(row.remarkOwnerPhone || row.remarkOwnerPhor), updatedAt: text(row.updatedAt) }
  })
}

export function buildCampusAnalysis(dorms, school) {
  const selected = dorms.filter(row => row.school === school)
  const totals = { rooms: selected.length, beds: 0, reached: 0, marketed: 0 }
  const buildings = new Map()
  for (const room of selected) {
    totals.beds += room.beds; totals.reached += room.reachedBeds.length; totals.marketed += room.marketedBeds.length
    const key = JSON.stringify([room.school, room.college, room.building])
    const group = buildings.get(key) || { key, school: room.school, college: room.college, building: room.building, rooms: 0, beds: 0, reached: 0, marketed: 0 }
    group.rooms++; group.beds += room.beds; group.reached += room.reachedBeds.length; group.marketed += room.marketedBeds.length
    buildings.set(key, group)
  }
  function finish(group) { return { ...group, unreached: group.beds - group.reached, reachedRate: rate(group.reached, group.beds), marketedRate: rate(group.marketed, group.beds) } }
  const items = [...buildings.values()].map(finish).sort((a, b) => (a.beds ? a.reached / a.beds : 0) - (b.beds ? b.reached / b.beds : 0) || a.college.localeCompare(b.college, 'zh-CN') || a.building.localeCompare(b.building, 'zh-CN', { numeric: true }))
  const colleges = new Map()
  for (const item of items) {
    const group = colleges.get(item.college) || { college: item.college, rooms: 0, beds: 0, reached: 0, marketed: 0, items: [] }
    group.rooms += item.rooms; group.beds += item.beds; group.reached += item.reached; group.marketed += item.marketed; group.items.push(item); colleges.set(item.college, group)
  }
  return { totals: finish(totals), buildings: items, colleges: [...colleges.values()].map(finish), dorms: selected }
}

function safeCell(value) {
  return typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? "'" + value : value
}
export function campusExportSheets(model, mode) {
  if (!['progress', 'rooms', 'details'].includes(mode)) throw new Error('导出类型无效')
  const progress = [['学校', '学院', '楼栋', '宿舍数', '床位数', '触达成功数', '营销成功数', '待触达数', '触达率', '营销率'],
    ...model.buildings.map(b => [b.school, b.college, b.building, b.rooms, b.beds, b.reached, b.marketed, b.unreached, `${b.reachedRate}%`, `${b.marketedRate}%`])]
  const rooms = [['学校', '学院', '楼栋', '楼层', '宿舍', '床位数', '触达成功数', '营销成功数', '待触达数', '备注', '更新时间'],
    ...model.dorms.map(r => [r.school, r.college, r.building, r.floor, r.room, r.beds, r.reachedBeds.length, r.marketedBeds.length, r.beds - r.reachedBeds.length, r.remark, r.updatedAt])]
  if (mode === 'progress') return [{ name: '楼栋进度', rows: progress.map(r => r.map(safeCell)) }]
  if (mode === 'rooms') return [{ name: '宿舍汇总', rows: rooms.map(r => r.map(safeCell)) }]
  const details = [['学校', '学院', '楼栋', '楼层', '宿舍', '床位号', '是否触达', '触达手机号', '是否营销', '营销手机号', '备注', '备注归属手机号', '更新时间']]
  for (const r of model.dorms) {
    for (let bed = 1; bed <= r.beds; bed++) {
      const reached = r.reachedBeds.includes(bed), marketed = r.marketedBeds.includes(bed)
      details.push([r.school, r.college, r.building, r.floor, r.room, bed, reached ? '是' : '否', reached && typeof r.reachedOwners[bed] === 'string' ? r.reachedOwners[bed] : '', marketed ? '是' : '否', marketed && typeof r.marketedOwners[bed] === 'string' ? r.marketedOwners[bed] : '', r.remark, r.remarkOwnerPhone, r.updatedAt])
    }
  }
  return [{ name: '人员登记明细', rows: details.map(r => r.map(safeCell)) }]
}
