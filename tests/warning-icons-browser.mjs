import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto('http://127.0.0.1:5190/apph5_test/wgsczs/')
  await page.locator('.login-field input').first().fill('13800000000')
  await page.locator('.login-field input').nth(1).fill('123456')
  await page.locator('.login-agreement input').check()
  await page.locator('.primary-login').click()
  await page.locator('.workbench-menu').getByRole('button', { name: '预警监控', exact: true }).click()
  assert.equal(await page.locator('.warning-entry-icon').count(), 2)
  const masks = await page.locator('.warning-entry-icon').evaluateAll(nodes => nodes.map(el => ({ mask: getComputedStyle(el).maskImage, color: getComputedStyle(el).backgroundColor, width: el.getBoundingClientRect().width })))
  assert.notEqual(masks[0].color, masks[1].color)
  for (const icon of masks) {
    assert.notEqual(icon.mask, 'none')
    assert.equal(icon.width, 28)
    const src = icon.mask.match(/url\(["']?(.*?)["']?\)/)?.[1]
    assert.equal(await page.evaluate(async src => (await fetch(src)).ok, src), true)
  }
  await page.screenshot({ path: fileURLToPath(new URL('../qa/warning-menu-icons.png', import.meta.url)), fullPage: true })
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
  }
  console.log('Both warning menu icons render; mobile/desktop layout passed')
} finally { await browser.close() }
