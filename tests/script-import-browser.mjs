import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  async function login(phone) {
    await page.goto('http://127.0.0.1:5178/')
    await page.locator('input[type=tel]').first().fill(phone)
    await page.locator('.login-agreement input').check()
    await page.locator('.primary-login').click()
    await page.getByRole('button', { name: '低产预警监控', exact: true }).click()
    await page.locator('.script-library-entry').click()
  }
  await login('13800000009')
  await page.locator('.script-import-actions').waitFor()
  assert.equal(await page.getByRole('button', { name: '维护话术', exact: true }).count(), 0)
  assert.equal(await page.locator('.sales-script-actions button').count(), 1)
  assert.ok(await page.locator('.script-import-actions').evaluate(node => Boolean(node.previousElementSibling?.classList.contains('sales-script-panel'))))
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载模板', exact: true }).click()
  assert.ok((await download).suggestedFilename().endsWith('.csv'))
  const upload = async text => page.locator('.script-import-actions input').setInputFiles({ name: '话术.csv', mimeType: 'text/csv', buffer: Buffer.from('\ufeff' + text) })
  await upload('产品名称,话术内容\r\n放号,"您好，先核实需求。\n请说明办理条件。"')
  await page.getByText('已导入 1 条话术', { exact: true }).waitFor()
  assert.match(await page.locator('.sales-script-content').textContent(), /先核实需求/)
  assert.match(await page.locator('.sales-script-meta').textContent(), /超级管理员导入.*更新于/)
  await upload('产品名称,话术内容\r\n放号,')
  await page.getByText('第2行话术须为1至4000字', { exact: true }).waitFor()
  assert.match(await page.locator('.sales-script-content').textContent(), /先核实需求/)
  for (const width of [320, 390, 560, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
    const positions = await page.locator('.script-product-tabs button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top))
    assert.ok(positions.every(top => Math.abs(top - positions[0]) < 1))
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'tests/script-import.png', fullPage: true })
  for (const phone of ['13800000000', '13800000001', '13800000003']) {
    await login(phone)
    assert.equal(await page.locator('.script-import-actions').count(), 0)
    assert.match(await page.locator('.sales-script-content').textContent(), /先核实需求/)
  }
  console.log('Superadmin CSV template/import, multiline content, atomic validation, persistence and role visibility passed')
} finally { await browser.close() }
