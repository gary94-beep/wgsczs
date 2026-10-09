import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const phone of ['13800000000', '13800000001', '13800000003']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('http://127.0.0.1:5178/')
    await page.locator('input[type=tel]').first().fill(phone)
    await page.locator('.login-agreement input').check()
    await page.locator('.primary-login').click()
    await page.locator('.workbench-menu button').first().click()
    const board = page.locator('.production-board')
    await board.waitFor()
    assert.equal(await board.locator('.board-row').count(), 5)
    assert.equal(await board.getByRole('progressbar').count(), 5)
    for (const row of await board.locator('.board-row').all()) assert.match(await row.locator('.board-completion b').textContent(), /^\d+%$/)
    const monthValue = await board.locator('.board-value').first().textContent()
    await board.getByRole('button', { name: '日', exact: true }).click()
    assert.notEqual(await board.locator('.board-value').first().textContent(), monthValue)
    const panel = page.locator('.ai-analysis-panel')
    await panel.locator('input').check()
    await page.route('**/api/ai/analyze', async route => {
      const summary = route.request().postDataJSON().summary
      assert.equal(summary.products.length, 5)
      assert.equal(summary.demo, true)
      assert.ok(!JSON.stringify(summary).includes('staffId'))
      const first = summary.products[0]
      assert.equal(first.month.production, Number(monthValue.replace(/[^\d.]/g, '')))
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ answer: '演示数据：请核实五项产品目标完成情况。' }) })
    })
    await panel.getByRole('button', { name: '开始分析' }).click()
    await panel.locator('.ai-result').waitFor()
    for (const width of [320, 390, 560, 1280]) {
      await page.setViewportSize({ width, height: 1000 })
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
    }
    await page.setViewportSize({ width: 390, height: 1000 })
    if (phone === '13800000000') await page.screenshot({ path: 'tests/overview-board.png', fullPage: false })
    await page.locator('.channel-type-filter select').selectOption({ index: 1 })
    assert.equal(await panel.locator('.ai-result').count(), 0)
    for (const label of await board.locator('.board-completion b').allTextContents()) assert.equal(label, '暂无进度')
    await board.locator('.board-row').first().click()
    await board.waitFor({ state: 'detached' })
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log('Board + overview AI: all three roles, day/month values, scope, category filter, drilldown and mobile layout passed')
} finally { await browser.close() }
