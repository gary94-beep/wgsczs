import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCampusDorms, buildCampusAnalysis, campusExportSheets } from '../src/utils/campusAnalysis.js'
import { getMockCampusData } from '../src/data/mockCampusData.js'

const fixture = () => normalizeCampusDorms(getMockCampusData('13800000009').dorms)
test('campus totals and weighted rates are scoped by school, grouped by college and sorted low first', () => {
  const result = buildCampusAnalysis(fixture(), 'GY')
  assert.deepEqual(result.totals, { rooms: 5, beds: 26, reached: 12, marketed: 5, unreached: 14, reachedRate: 46, marketedRate: 19 })
  assert.equal(result.buildings.length, 4)
  assert.equal(result.buildings[0].building, '3栋')
  assert.equal(result.buildings.find(b => b.college === '食科' && b.building === '1栋').rooms, 2)
  assert.equal(result.buildings.find(b => b.college === '机电' && b.building === '1栋').rooms, 1)
  assert.equal(result.colleges.find(c => c.college === '食科').reachedRate, 50)
  assert.equal(buildCampusAnalysis(fixture(), 'ZK').totals.rooms, 2)
  assert.equal(buildCampusAnalysis([], '').totals.reachedRate, 0)
})
test('legacy JSON fields and envelope formats normalize; repeated bed numbers do not inflate rates', () => {
  const row = getMockCampusData('13800000009').dorms[0]
  const result = normalizeCampusDorms(JSON.stringify({ rows: [{ ...row, reachedBeds: '[1,"2",2]', marketedBeds: '[1]', reachedOwners: '{"1":"13800000009"}' }] }))
  assert.deepEqual(result[0].reachedBeds, [1, 2])
  assert.equal(result[0].reachedOwners[1], '13800000009')
  assert.deepEqual(normalizeCampusDorms({ list: [] }), [])
})
test('duplicates, partial lists, invalid beds and malformed responses fail instead of inventing counts', () => {
  const row = getMockCampusData('13800000009').dorms[0]
  for (const input of [[row, row], [{ ...row, beds: -1 }], [{ ...row, reachedBeds: [7] }], [{ ...row, marketedBeds: [6] }], [{ ...row, reachedBeds: 'bad' }], { rows: [row], total: 3 }, {}]) assert.throws(() => normalizeCampusDorms(input))
})
test('exports are current-school only, preserve bed owners, and protect spreadsheet formula strings', () => {
  const result = buildCampusAnalysis(fixture(), 'ZK')
  const progress = campusExportSheets(result, 'progress')[0]
  assert.equal(progress.rows.length, 3)
  assert.ok(progress.rows.slice(1).every(r => r[0] === 'ZK'))
  const rooms = campusExportSheets(result, 'rooms')[0]
  assert.equal(rooms.rows.length, 3)
  const details = campusExportSheets(result, 'details')[0]
  assert.equal(details.rows.length, 9)
  assert.equal(details.rows[1][7], '13800000009')
  result.dorms[0].remark = '=HYPERLINK("malicious")'
  assert.ok(campusExportSheets(result, 'rooms')[0].rows[1][9].startsWith("'="))
  assert.throws(() => campusExportSheets(result, 'unknown'))
})
test('campus demo permissions remain independent from grid role assignments', () => {
  assert.equal(getMockCampusData('13800000000').permission.role, 1)
  assert.throws(() => getMockCampusData('13800000003'), /权限/)
})
