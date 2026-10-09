import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async content => { window.copiedScript = content } } }) })
  async function login(phone) {
    await page.goto('http://127.0.0.1:5178/')
    await page.locator('input[type=tel]').first().fill(phone)
    await page.locator('input[type=checkbox]').check()
    await page.locator('.primary-login').click()
    await page.getByRole('button', { name: '低产预警监控', exact: true }).click()
    assert.equal(await page.locator('.sales-script-panel').count(), 0)
    await page.getByRole('button', { name: '经典话术库 产品话术 · 沟通参考' }).click()
  }
  await login('13800000000')
  assert.match(await page.locator('.sales-script-meta').textContent(), /话术示例/)
  assert.equal(await page.getByRole('button', { name: '维护话术', exact: true }).count(), 0)
  const content = await page.locator('.sales-script-content').textContent()
  await page.getByRole('button', { name: '复制话术', exact: true }).click()
  assert.equal(await page.evaluate(() => window.copiedScript), content)
  await page.getByRole('tab', { name: '千兆运营', exact: true }).click()
  assert.match(await page.locator('.sales-script-panel summary').textContent(), /千兆运营/)
  assert.notEqual(await page.locator('.sales-script-content').textContent(), content)
  for (const phone of ['13800000001', '13800000003']) {
    await login(phone)
    assert.equal(await page.locator('.sales-script-content').textContent(), content)
    assert.equal(await page.getByRole('button', { name: '维护话术', exact: true }).count(), 0)
    await page.getByRole('button', { name: '复制话术', exact: true }).click()
    assert.equal(await page.evaluate(() => window.copiedScript), content)
    await page.setViewportSize({ width: 320, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
  }
  await page.locator('.sales-script-panel').screenshot({ path: 'tests/sales-script-panel.png' })
  assert.deepEqual(errors, [])
  console.log('Product switching, copy-only actions and role permissions passed.')
} finally { await browser.close() }
