import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5178/')
  await page.locator('input[type=tel]').first().fill('13800000003')
  await page.locator('.login-agreement input').check()
  await page.locator('.primary-login').click()
  await page.getByRole('button', { name: '低产预警监控', exact: true }).click()
  const panel = page.locator('.ai-analysis-panel')
  await panel.waitFor()
  assert.equal(await panel.getByRole('button', { name: '短板分析优化', exact: true }).count(), 1)
  assert.equal(await panel.getByRole('button', { name: '异常检查', exact: true }).count(), 0)
  assert.equal(await panel.getByRole('button', { name: '跟进建议', exact: true }).count(), 0)
  assert.equal(await panel.locator('.ai-run').isDisabled(), true)
  await panel.locator('input[type=checkbox]').check()
  // Intercept test traffic; never spend real account credit in browser tests.
  await page.route('**/api/ai/analyze', async route => {
    const payload = route.request().postDataJSON()
    assert.match(payload.question, /短板分析优化.*数据依据.*优化建议/)
    assert.equal(payload.summary.demo, true)
    assert.ok(!JSON.stringify(payload).includes('staffId'))
    assert.ok(!JSON.stringify(payload).includes('staffName'))
    assert.ok(!JSON.stringify(payload).includes('channelCode'))
    await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: '尚未配置 MoMA API 密钥' }) })
  })
  await panel.locator('.ai-run').click()
  await panel.getByRole('alert').filter({ hasText: '尚未配置' }).waitFor()
  await page.unroute('**/api/ai/analyze')
  await page.route('**/api/ai/analyze', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ answer: '演示数据：本月日均较上月同期下降，建议核实数据完整性。' }) }))
  await panel.locator('.ai-run').click()
  await panel.locator('.ai-result').waitFor()
  await panel.getByRole('button', { name: '自定义提问', exact: true }).click()
  assert.equal(await panel.locator('.ai-run').isDisabled(), true)
  await panel.locator('textarea').fill('当前产品有什么异常？')
  assert.equal(await panel.locator('.ai-run').isDisabled(), false)
  for (const width of [320, 390, 560, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await panel.screenshot({ path: 'tests/ai-panel.png' })
  await page.locator('.monitor-filter select').last().selectOption({ index: 1 })
  assert.equal(await panel.locator('.ai-result').count(), 0)
  assert.equal(await panel.locator('input[type=checkbox]').isChecked(), false)
  assert.deepEqual(errors, [])
  console.log('AI panel: consent, sanitized summary, errors, success, custom question, stale result reset and responsive layout passed')
} finally { await browser.close() }
