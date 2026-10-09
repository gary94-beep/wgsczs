import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const phone of ['13800000000', '13800000001', '13800000003', '13800000009']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.goto('http://127.0.0.1:5178/')
    await page.locator('input[type=tel]').first().fill(phone)
    await page.locator('.login-agreement input').check()
    await page.locator('.primary-login').click()
    await page.getByRole('button', { name: '生产总览', exact: true }).click()
    await page.locator('.production-board').waitFor()
    assert.equal(await page.locator('.target-management').count(), phone === '13800000009' ? 1 : 0)
    assert.equal(await page.locator('.capacity-card').count(), 5)
    if (phone === '13800000009') {
      await page.getByRole('combobox', { name: '生产类型', exact: true }).selectOption('三星+渠道')
      assert.equal(await page.locator('.target-management').count(), 0)
    }
    await page.close()
  }
  console.log('Target management visible only to superadmin; production viewing unchanged')
} finally { await browser.close() }
