import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  for (const phone of ['13800000000', '13800000001', '13800000003']) {
    await page.goto('http://127.0.0.1:5178/')
    await page.locator('input[type=tel]').first().fill(phone)
    await page.locator('input[type=checkbox]').check()
    await page.locator('.primary-login').click()
    await page.locator('.workbench-menu button').first().click()
    const filter = page.getByRole('combobox', { name: '生产类型', exact: true })
    const total = await page.locator('.capacity-month .capacity-values > strong').first().textContent()
    assert.deepEqual(await filter.locator('option').allTextContents(), ['全部类型', '三星+渠道', '末梢渠道', '直销队伍'])
    for (const type of ['三星+渠道', '末梢渠道', '直销队伍']) {
      await filter.selectOption(type)
      assert.notEqual(await page.locator('.capacity-month .capacity-values > strong').first().textContent(), total)
      assert.equal(await page.locator('.capacity-period-heading > b, .capacity-values > div, .target-management').count(), 0)
      assert.equal(await page.locator('.capacity-progress').count(), 10)
      assert.equal(await page.locator('.trend-svg').count(), 10)
    }
    await filter.selectOption('三星+渠道')
    await page.locator('.product-section .capacity-card-heading').first().click()
    if (phone === '13800000000') {
      assert.equal(await filter.inputValue(), '三星+渠道')
      assert.equal(await page.locator('.capacity-values > div, .capacity-period-heading > b').count(), 0)
      assert.ok(await page.locator('.capacity-progress').count() > 0)
      assert.equal(await page.locator('.drill-list .capacity-card-heading').count(), 2)
      await page.locator('.drill-list .capacity-card-heading').first().click()
    }
    if (phone !== '13800000003') {
      assert.equal(await filter.inputValue(), '三星+渠道')
      assert.equal(await page.locator('.capacity-values > div, .capacity-period-heading > b').count(), 0)
      assert.ok(await page.locator('.capacity-progress').count() > 0)
      assert.equal(await page.locator('.drill-list .capacity-card-heading').count(), 2)
      await page.locator('.drill-list .capacity-card-heading').first().click()
    }
    assert.equal(await filter.count(), 0)
    await page.getByRole('tab', { name: '3星+渠道', exact: true }).click()
    await page.getByRole('spinbutton', { name: '低产阈值' }).fill('100')
    assert.equal(await page.locator('.channel-card').count(), 1)
    assert.match(await page.locator('.channel-card').textContent(), /异业门店/)
    await page.screenshot({ path: `tests/channel-type-${phone}.png` })
    await page.locator('.breadcrumbs button').first().click()
    await page.locator('.workbench-menu button').first().click()
    await filter.selectOption('')
    assert.equal(await page.locator('.capacity-progress').count(), 10)
    assert.equal(await page.locator('.capacity-month .capacity-values > strong').first().textContent(), total)
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 })
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    if (phone === '13800000003') await page.screenshot({ path: 'tests/channel-type-overview.png' })
  }
  assert.deepEqual(errors, [])
  console.log('Category selection, drill-down, warnings, role scope and responsive layout passed.')
} finally {
  await browser.close()
}
