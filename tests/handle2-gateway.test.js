import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { buildCapacityMetric } from '../src/utils/capacityMetrics.js'

const code = readFileSync(new URL('../sczs_biz_api.js', import.meta.url), 'utf8')
const common = readFileSync(new URL('../sczs_common_api.js', import.meta.url), 'utf8')
const ai = readFileSync(new URL('../sczs_ai_api.js', import.meta.url), 'utf8')
const date = '2026-10-08'

test('AI gateway is independent and has no import or dashboard endpoints', () => {
  for (const fun of ['wgsc_importRows', 'wgsc_fetchDashboard']) {
    const result = run(fun, {}, { source: ai })
    assert.match(result.retMsg, /非法调用/)
    assert.equal(result.queries.length, 0)
  }
  assert.match(run('wgsc_analyze', { token: '' }).retMsg, /token/)
  const result = run('wgsc_analyze', { consent: '1', question: '分析', view: 'overview' }, {
    transport: () => { throw new Error('Bearer secret-should-not-leak') }
  })
  assert.match(result.retMsg, /外呼失败/)
  assert.ok(!JSON.stringify(result).includes('secret-should-not-leak'))
})
const tables = {
  permission: 'app_open_api_c002_wgsc_permission_1', region: 'app_open_api_c003_wgsc_region_capacity_1',
  channel: 'app_open_api_c001_wgsc_chn_capacity_1', staffCapacity: 'app_open_api_c003_wgsc_staff_capacity_1',
  channelInfo: 'app_open_api_c002_wgsc_chn_level_1', terminal: 'app_open_api_c001_wgsc_staff_terminal_1',
  staff: 'app_open_api_c001_wgsc_staff_1', targets: 'app_open_api_c001_wgsc_target_1', scripts: 'app_open_api_c001_wgsc_script_1'
}
function fixture() {
  const db = Object.fromEntries(Object.values(tables).map(t => [t, []]))
  db[tables.permission] = [
    { phone: '13800000009', name: 'Admin', role: 1, super_admin: 1, enabled: 1 },
    { phone: '13800000001', name: 'Branch', role: 2, branch: '城区分公司', super_admin: 0, enabled: 1 },
    { phone: '13800000003', name: 'Grid', role: 3, branch: '城区分公司', grid: '东区', super_admin: 0, enabled: 1 }
  ]
  const base = { stat_date: date, snapshot_time: `${date} 08:00:00`, product_name: '放号' }
  for (const [branch, grid, capacity] of [['全市', '全市', 100], ['城区分公司', '城区分公司', 40], ['城区分公司', '东区', 35], ['高新分公司', '高新分公司', 60], ['高新分公司', '南朗', 60]]) {
    for (const [period, n] of [['mon', capacity], ['day', 3], ['week', 14], ['last_mon', 16]]) db[tables.region].push({ ...base, branch_company: branch, grid_name: grid, capacity: n, prod_period_type: period })
  }
  db[tables.channelInfo] = [{ chn_code: 'C1', chn_name: 'Star store', branch: '城区分公司', grid: '东区', star: '四星级', star_level: '三星+' }]
  db[tables.staff] = [{ staff_no: 'S1', staff_name: 'Test Manager', branch: '城区分公司', grid: '东区', team_type: '行销经理' }]
  db[tables.terminal] = ['T1', 'T2'].map(staff_no => ({ staff_no, staff_name: staff_no, branch: '城区分公司', grid: '东区', chn_name: 'Tail store', agent: 'Provider' }))
  for (const period of ['mon', 'day', 'week', 'last_mon']) {
    db[tables.channel].push({ ...base, branch_company: '城区分公司', grid_name: '东区', channel_code: 'C1', channel_name: 'Star store', prod_period_type: period, capacity: 1 })
    for (const [staff_no, channel_code] of [['S1', 'D1'], ['S1', 'D2'], ['T1', 'T'], ['T2', 'T']]) db[tables.staffCapacity].push({ ...base, branch_company: '城区分公司', grid_name: '东区', staff_no, channel_code, channel_name: channel_code, prod_period_type: period, capacity: 1 })
    db[tables.channel].push({ ...base, branch_company: '高新分公司', grid_name: '南朗', channel_code: 'OUT', channel_name: 'Outside', prod_period_type: period, capacity: 10 })
    db[tables.staffCapacity].push({ ...base, branch_company: '高新分公司', grid_name: '南朗', staff_no: 'OUT', channel_code: 'OUT', channel_name: 'Outside', prod_period_type: period, capacity: 10 })
  }
  return db
}
function run(funCode, params = {}, { phone = '13800000009', db = fixture(), source = funCode === 'wgsc_analyze' ? ai : code, failWrites = false, transport } = {}) {
  const queries = [], ctx = { Params: { token: 'valid', ...params, funCode }, JsResult: {}, CustomizeUtil: {
    redisGet: () => JSON.stringify({ data: { value: JSON.stringify({ phone }) } }),
    getMobile: () => ({ mobile: phone }),
    abilitySql: (query, args) => {
      queries.push({ query, args })
      if (/^INSERT/.test(query)) {
        if (failWrites) return JSON.stringify({ retCode: '1', retMsg: 'write failure' })
        return JSON.stringify({ retCode: '0', data: { affectedRows: 1 } })
      }
      const table = query.match(/FROM (\w+)/)?.[1]
      let records = db[table] || []
      if (args.phone) records = records.filter(r => r.phone === args.phone && r.enabled === 1)
      if (args.authBranch) records = records.filter(r => (r.branch_company || r.branch) === args.authBranch)
      if (args.authGrid) records = records.filter(r => (r.grid_name || r.grid) === args.authGrid)
      if (args.cutoff) records = records.filter(r => r.stat_date === args.cutoff)
      if (args.month) records = records.filter(r => r.target_month === args.month)
      if (query.includes('MAX(stat_date)')) records = [{ stat_date: records.map(r => r.stat_date).sort().at(-1) || null }]
      return JSON.stringify({ retCode: '0', data: { results: records } })
    }
  } }
  if (transport) ctx.wgscMomaTransport = transport
  vm.runInNewContext(source, ctx, { timeout: 1000 })
  return { ...JSON.parse(ctx.JsResult.result).result, queries }
}
test('gateway requires token and server-derived superadmin on every mutation', () => {
  assert.equal(run('wgsc_fetchDashboard', { token: '' }).retCode, '00008')
  for (const fun of ['wgsc_importCapacity', 'wgsc_importRows', 'wgsc_importTargets', 'wgsc_importSalesScripts', 'wgsc_saveSalesScript']) {
    const result = run(fun, { phone: '13800000009', isSuperAdmin: true }, { phone: '13800000001' })
    assert.match(result.retMsg, /仅超级管理员/)
    assert.ok(!result.queries.some(q => /^INSERT|DELETE/.test(q.query)))
  }
  assert.notEqual(run('constructor').retCode, '0')
})
test('dashboard uses six actual tables, scopes all source reads, and does not double-count', () => {
  const result = run('wgsc_fetchDashboard', {}, { phone: '13800000003' })
  assert.equal(result.retCode, '0', result.retMsg)
  const data = result.data
  assert.deepEqual(data.organization.grids.map(r => r.gridName), ['东区'])
  assert.equal(data.rows.find(r => r.staffId === 'S1').production, 2)
  assert.equal(data.rows.find(r => r.channelType === '末梢渠道').production, 2)
  assert.equal(data.rows.find(r => r.channelType === '三星+渠道').production, 1)
  const metric = buildCapacityMetric(data, 'newNumbers', ['城区分公司::东区'], '', { level: 'grid', id: '城区分公司::东区' })
  assert.equal(metric.production, 35)
  assert.equal(metric.monthAverage, 35 / 8)
  assert.equal(metric.previousAverage, 16 / 8)
  assert.equal(metric.weeklyAverage, 2)
  assert.equal(metric.target, null)
})
test('alerts aggregate before applying threshold and reject out-of-scope grid IDs', () => {
  const result = run('wgsc_fetchAlerts', { gridIds: JSON.stringify(['城区分公司::东区']), productId: 'newNumbers', threshold: 1, period: 'month' })
  assert.equal(result.retCode, '0', result.retMsg)
  assert.equal(result.data.people.length, 0)
  assert.equal(result.data.channels.length, 1)
  assert.equal(result.data.channels[0].channelType, '三星+渠道')
  assert.match(run('wgsc_fetchAlerts', { gridIds: '["高新分公司::南朗"]', productId: 'newNumbers', threshold: 1, period: 'day' }, { phone: '13800000003' }).retMsg, /无权/)
})
test('search matches staff ID and names without leaking other branches', () => {
  const result = run('wgsc_searchCapacity', { query: 'S1', kind: 'people', gridIds: '[]' }, { phone: '13800000001' })
  assert.equal(result.retCode, '0', result.retMsg)
  assert.equal(result.data.results[0].values[0].month, 2)
  assert.equal(result.data.results[0].values[0].day, 2)
  assert.equal(run('wgsc_searchCapacity', { query: 'Outside', kind: 'channels' }, { phone: '13800000001' }).data.results.length, 0)
})
test('imports normalize times and star levels, parameterize writes, and never delete history', () => {
  const row = { branch_company: '城区分公司', grid_name: '东区', prod_period_type: '月产能（mon）', product_name: '放号', capacity: 0, stat_date: 20261008, snapshot_time: '20261009 080000' }
  const result = run('wgsc_importCapacity', { target: 'region', rows: JSON.stringify([row]) })
  assert.equal(result.retCode, '0', result.retMsg)
  const write = result.queries.find(q => /^INSERT/.test(q.query))
  assert.equal(write.args.stat_date, date)
  assert.equal(write.args.snapshot_time, '2026-10-09 08:00:00')
  assert.ok(write.query.includes('ON DUPLICATE KEY UPDATE'))
  assert.ok(!result.queries.some(q => /^DELETE/.test(q.query)))
  const star = run('wgsc_importRows', { target: 'channelInfo', rows: JSON.stringify([{ uni_code: '001', chn_code: 'C1', chn_name: "O'Brien", branch: '城区分公司', grid: '东区', star: '四星级', star_level: '非三星+' }]) })
  assert.equal(star.queries.find(q => /^INSERT/.test(q.query)).args.star_level, '三星+')
  assert.ok(!star.queries.at(-1).query.includes("O'Brien"))
  const failure = run('wgsc_importCapacity', { target: 'region', rows: JSON.stringify([row]) }, { failWrites: true })
  assert.equal(failure.data.failed, 1)
})
test('validation errors produce no writes; common permission now returns organization', () => {
  for (const capacity of ['', 'Infinity', -1]) {
    const result = run('wgsc_importCapacity', { target: 'region', rows: [{ branch_company: 'B', grid_name: 'G', product_name: '放号', capacity, prod_period_type: 'mon', stat_date: date }] })
    assert.notEqual(result.retCode, '0')
    assert.ok(!result.queries.some(q => /^INSERT/.test(q.query)))
  }
  assert.notEqual(run('wgsc_importCapacity', { target: 'region', rows: [{ branch_company: 'B', grid_name: 'G', product_name: '放号', capacity: 1, prod_period_type: 'mon', stat_date: '2026-02-30' }] }).retCode, '0')
  const p = run('wgsc_fetchPermission', { phone: '13800000003' }, { source: common })
  assert.equal(p.data.gridId, '城区分公司::东区')
  assert.equal(p.data.isSuperAdmin, false)
})
test('same-period cutoff must match all three capacity tables', () => {
  const db = fixture(); db[tables.channel].forEach(r => { r.stat_date = '2026-10-07' })
  assert.match(run('wgsc_fetchDashboard', {}, { db }).retMsg, /日期不一致/)
})
test('permission updates are admin-only and cannot revoke the active administrator', () => {
  const row = { name: 'Manager', phone: '13800000111', role: 'grid', branch: '城区分公司', grid: '东区', is_super_admin: '0', enabled: '1' }
  const result = run('wgsc_importRows', { target: 'permission', rows: [row] })
  assert.equal(result.retCode, '0', result.retMsg)
  const write = result.queries.find(q => /^INSERT/.test(q.query))
  assert.ok(write.query.includes(tables.permission))
  assert.equal(write.args.role, 3)
  assert.equal(write.args.super_admin, 0)
  assert.ok(!write.query.includes('is_super_admin'))
  assert.match(run('wgsc_importRows', { target: 'permission', rows: [{ ...row, phone: '13800000009', enabled: '0' }] }).retMsg, /不能禁用/)
  assert.match(run('wgsc_importRows', { target: 'permission', rows: [row] }, { phone: '13800000003' }).retMsg, /超级管理员/)
})

test('permission reads translate numeric database roles and reject unknown roles', () => {
  for (const [phone, role] of [['13800000009', 'city'], ['13800000001', 'branch'], ['13800000003', 'grid']]) {
    const db = fixture()
    db[tables.permission].forEach(p => { p.role = String(p.role) })
    const result = run('wgsc_fetchPermission', { phone }, { source: common, db })
    assert.equal(result.retCode, '0', result.retMsg)
    assert.equal(result.data.role, role)
    assert.equal(result.data.isSuperAdmin, role === 'city')
  }
  const db = fixture()
  db[tables.permission][0].role = 9
  assert.notEqual(run('wgsc_fetchDashboard', {}, { db }).retCode, '0')
})

test('Handle2 AI reconstructs authorized summaries instead of trusting browser data', () => {
  let request
  const transport = req => { request = req; return { statusCode: 200, body: { choices: [{ message: { content: '## 短板\n**建议**：核实跟进进度。' } }] } } }
  const result = run('wgsc_analyze', { consent: '1', question: '分析短板', view: 'overview', summary: { production: 999999 } }, { phone: '13800000001', transport })
  assert.equal(result.retCode, '0', result.retMsg)
  assert.ok(result.data.answer.length <= 300)
  assert.ok(!/[#*|]/.test(result.data.answer))
  const summary = JSON.parse(request.body.messages[1].content).summary
  assert.equal(summary.products[0].month.production, 40)
  assert.equal(summary.products[0].day.production, 3)
  assert.equal(summary.products[0].weeklyAverage, 2)
  assert.equal(summary.products[0].month.target, null)
  assert.equal(summary.products[0].previousAverage, 2)
  assert.ok(!JSON.stringify(summary).includes('13800000001'))
  assert.ok(!JSON.stringify(summary).includes('Test Manager'))
  assert.ok(!JSON.stringify(summary).includes('999999'))
  assert.equal(request.url, 'https://moma.cmecloud.cn/tokenplan-personal/v1/chat/completions')
})

test('Handle2 AI validates consent, scope, adapter configuration and upstream errors', () => {
  const params = { consent: '1', question: '分析', view: 'alerts', productId: 'newNumbers', period: 'month', threshold: 2 }
  let called = 0
  const transport = () => { called++; return { statusCode: 401 } }
  assert.match(run('wgsc_analyze', { ...params, consent: '0' }, { transport }).retMsg, /同意/)
  assert.match(run('wgsc_analyze', { ...params, gridIds: '["高新分公司::南朗"]' }, { phone: '13800000001', transport }).retMsg, /无权/)
  assert.equal(called, 0)
  assert.match(run('wgsc_analyze', params).retMsg, /适配器/)
  assert.match(run('wgsc_analyze', params, { transport }).retMsg, /鉴权/)
  let summary
  const ok = run('wgsc_analyze', params, { transport: req => { summary = JSON.parse(req.body.messages[1].content).summary; return { statusCode: 200, body: { choices: [{ message: { content: '建议核实。'.repeat(100) } }] } } } })
  assert.equal(ok.retCode, '0', ok.retMsg)
  assert.equal(ok.data.answer.length, 300)
  assert.deepEqual(summary.alerts.map(r => r.count), [1, 1, 1])
})
