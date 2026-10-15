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
  await page.locator('.workbench-menu').getByRole('button', { name: '生产总览', exact: true }).click()
  const board = page.locator('.production-board')
  await board.waitFor()
  for (const type of ['三星+渠道', '末梢渠道', '直销队伍', '']) {
    await page.locator('.channel-type-filter select').selectOption(type)
    for (const period of ['日', '月']) {
      await board.getByRole('button', { name: period, exact: true }).click()
      assert.equal(await board.locator('.board-columns > span').count(), type ? 2 : 3)
      assert.equal(await board.locator('.board-completion').count(), type ? 0 : 5)
      assert.equal(await board.getByRole('progressbar').count(), type ? 0 : 5)
      assert.equal(await board.locator('.board-value').count(), 5)
      if (type) assert.ok(!(await board.innerText()).includes('暂无进度'))
    }
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    }
    console.log(`${type || '全部类型'}: progress visibility and responsive layout passed`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.channel-type-filter select').selectOption('三星+渠道')
  await board.screenshot({ path: fileURLToPath(new URL('../qa/board-capacity-only.png', import.meta.url)) })
} finally { await browser.close() }
