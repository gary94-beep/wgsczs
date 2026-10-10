import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')

const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5180/'
const output = new URL('../qa/', import.meta.url)
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  for (const [phone, role] of [['13800000000', 'city'], ['13800000001', 'branch'], ['13800000003', 'grid'], ['13800000009', 'admin']]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base)
    await page.locator('.primary-login').waitFor()
    if (role === 'city') await page.screenshot({ path: fileURLToPath(new URL('login.png', output)), fullPage: true })
    await page.locator('.login-field input').first().fill(phone)
    await page.locator('.login-agreement input').check()
    await page.locator('.login-field input').nth(1).fill('123456')
    await page.locator('.primary-login').click()
    await page.locator('.workbench-heading').waitFor()
    assert.equal(await page.locator('.workbench-menu button').count(), role === 'admin' ? 11 : 4)
    await page.getByRole('button', { name: '生产总览', exact: true }).click()
    await page.locator('.product-section .capacity-card').first().waitFor()
    assert.equal(await page.locator('.product-section .capacity-card').count(), 5)
    assert.equal(await page.locator('.target-management').count(), role === 'admin' ? 1 : 0)
    if (role === 'city') await page.screenshot({ path: fileURLToPath(new URL('overview.png', output)), fullPage: true })
    await page.locator('.breadcrumbs button').first().click()
    await page.getByRole('button', { name: '低产预警监控', exact: true }).click()
    await page.locator('.alert-summary').waitFor()
    assert.equal(await page.locator('.alert-summary > div').count(), 3)
    if (role === 'grid') assert.equal(await page.locator('.monitor-filter select:disabled').count(), 1)
    if (role === 'city') await page.screenshot({ path: fileURLToPath(new URL('alerts.png', output)), fullPage: true })
    await page.getByRole('button', { name: /经典话术库/ }).click()
    await page.locator('.script-product-tabs').waitFor()
    assert.equal(await page.locator('.script-import-actions').count(), role === 'admin' ? 1 : 0)
    await page.locator('.breadcrumbs button').first().click()
    await page.getByRole('button', { name: '产能速查', exact: true }).click()
    await page.locator('input[type=search]').fill(role === 'grid' || role === 'branch' ? '黄志远' : '梁敏')
    await page.locator('.search-result').first().waitFor()
    assert.ok((await page.locator('.search-result').count()) >= 1)
    if (role === 'city') await page.screenshot({ path: fileURLToPath(new URL('search.png', output)), fullPage: true })
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `overflow ${role}/${width}`)
    }
    assert.deepEqual(errors, [])
    console.log(`${role}: login, overview, alerts, library, search and responsive widths passed`)
    await context.close()
  }
} finally { await browser.close() }
