import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const output = new URL('../qa/', import.meta.url)
await fs.mkdir(output, { recursive: true })
try {
  for (const [phone, role] of [['13800000000', 'city'], ['13800000001', 'branch'], ['13800000003', 'grid']]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('http://127.0.0.1:5190/apph5_test/wgsczs/')
    await page.locator('.login-field input').first().fill(phone)
    await page.locator('.login-field input').nth(1).fill('123456')
    await page.locator('.login-agreement input').check()
    await page.locator('.primary-login').click()
    await page.locator('.workbench-menu').waitFor()
    await page.locator('.workbench-menu').getByRole('button', { name: '生产总览', exact: true }).click()
    await page.locator('.capacity-product-icon').first().waitFor()
    assert.equal(await page.locator('.ai-panel').count(), 0)
    assert.equal(await page.getByText('AI经营分析', { exact: true }).count(), 0)
    assert.equal(await page.locator('.capacity-product-icon').count(), 5)
    const icons = await page.locator('.capacity-product-icon').evaluateAll(nodes => nodes.map(el => ({ mask: getComputedStyle(el, '::before').maskImage, style: el.getAttribute('style'), color: getComputedStyle(el, '::before').backgroundColor })))
    for (const icon of icons) {
      assert.notEqual(icon.mask, 'none')
      const src = icon.mask.match(/url\(["']?(.*?)["']?\)/)?.[1]
      assert.ok(src)
      assert.equal(await page.evaluate(async src => (await fetch(src)).ok, src), true)
    }
    assert.equal(await page.locator('.capacity-comparison em').first().evaluate(el => getComputedStyle(el).fontSize), '15px')
    if (role === 'city') await page.screenshot({ path: fileURLToPath(new URL('overview-icons.png', output)), fullPage: true })
    await page.locator('.breadcrumbs button').first().click()
    await page.locator('.workbench-menu').getByRole('button', { name: '预警监控', exact: true }).click()
    assert.equal(await page.locator('.warning-menu button').count(), 2)
    assert.ok(!(await page.locator('.breadcrumbs').innerText()).includes('生产总览'))
    await page.locator('.warning-menu').getByRole('button', { name: '低产预警', exact: true }).click()
    await page.getByRole('spinbutton', { name: '低产阈值', exact: true }).waitFor()
    assert.equal(await page.getByText('AI经营分析', { exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: '开始分析', exact: true }).count(), 0)
    await page.getByRole('button', { name: '预警监控', exact: true }).first().click()
    await page.locator('.warning-menu').getByRole('button', { name: '异动预警', exact: true }).click()
    assert.equal(await page.getByRole('spinbutton', { name: '日均减少率', exact: true }).inputValue(), '30')
    assert.equal(await page.getByRole('spinbutton', { name: '日均减少值', exact: true }).inputValue(), '5')
    assert.equal(await page.getByRole('spinbutton', { name: '低产阈值', exact: true }).count(), 0)
    await page.locator('.alert-summary').waitFor()
    if (role === 'grid') assert.equal(await page.locator('.monitor-filter select:disabled').count(), 1)
    if (role !== 'city') assert.equal(await page.locator('.monitor-filter').filter({ hasText: '分公司' }).count(), 0)
    await page.getByRole('spinbutton', { name: '日均减少率', exact: true }).fill('0')
    await page.getByRole('spinbutton', { name: '日均减少值', exact: true }).fill('0')
    await page.getByRole('button', { name: '筛选', exact: true }).click()
    await page.locator('.alert-summary').waitFor()
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${role}/${width} overflow`)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: fileURLToPath(new URL(`change-${role}.png`, output)), fullPage: true })
    assert.deepEqual(errors, [])
    console.log(`${role}: icons, warning menus, filters and mobile/desktop layout passed`)
    await page.close()
  }
} finally { await browser.close() }
