import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mockCapacityRows, mockPermissions } from '../src/data/mockData.js'
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
    await page.locator('.workbench-menu').waitFor()
    assert.equal(await page.locator('.capacity-search').count(), 0)
    assert.equal(await page.locator('.workbench-menu button').count(), 4)
    assert.deepEqual(await page.locator('.workbench-menu strong').allTextContents(), ['生产总览', '产能速查', '低产预警监控', '校园生产管理'])
    assert.equal(await page.locator('.workbench-menu small').count(), 0)
    await page.getByRole('button', { name: '产能速查', exact: true }).click()
    const panel = page.locator('.capacity-search')
    await panel.waitFor()
    const user = mockPermissions[phone]
    const row = mockCapacityRows.find(item => (user.role === 'city' || item.branchId === user.branchId) && (user.role !== 'grid' || item.gridId === user.gridId))
    await panel.getByRole('searchbox').fill(row.staffId)
    await panel.locator('.search-result').first().waitFor()
    assert.ok((await panel.locator('.search-result h3').allTextContents()).every(name => name === row.staffName))
    assert.equal(await panel.locator('.search-result').first().locator('.search-metrics > div').count(), 6)
    await panel.getByRole('combobox', { name: '查询产品' }).selectOption(row.productId)
    assert.equal(await panel.locator('.search-result').first().locator('.search-metrics > div').count(), 2)
    await panel.getByRole('button', { name: '渠道', exact: true }).click()
    await panel.getByRole('searchbox').fill(row.channelCode)
    await panel.locator('.search-result').first().waitFor()
    assert.ok((await panel.locator('.search-result h3').allTextContents()).every(name => name === (row.microChannelName || row.channel)))
    for (const width of [320, 390, 560, 1280]) {
      await page.setViewportSize({ width, height: 1000 })
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    if (phone === '13800000003') await panel.screenshot({ path: 'tests/search-panel.png' })
    await panel.getByRole('searchbox').fill('不存在的渠道xyz')
    await panel.getByText('当前可查看范围内暂无匹配结果').waitFor()
    await panel.getByRole('button', { name: '清空搜索' }).click()
    assert.equal(await panel.locator('.search-result').count(), 0)
    if (user.role !== 'city') {
      const outside = mockCapacityRows.find(item => user.role === 'branch' ? item.branchId !== user.branchId : item.gridId !== user.gridId)
      if (outside) {
        await panel.getByRole('searchbox').fill(outside.channelCode)
        assert.equal(await panel.locator('.search-result').count(), 0)
      }
    }
    await page.getByRole('button', { name: '工作台', exact: true }).first().click()
    await page.locator('.workbench-menu button').first().click()
    await page.locator('.production-board').waitFor()
    assert.equal(await page.locator('.capacity-search').count(), 0)
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log('Capacity search: staff IDs, channel codes, products, clear/empty, three roles and responsive layouts passed')
} finally { await browser.close() }
