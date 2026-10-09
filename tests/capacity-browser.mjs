import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5178/')
  assert.equal(await page.locator('.brand-panel p').count(), 0)
  assert.equal(await page.locator('.brand-panel h1').evaluate(node => getComputedStyle(node, '::after').display), 'none')
  await page.screenshot({ path: 'tests/capacity-login.png', fullPage: true })
  await page.locator('input[type=tel]').first().fill('13800000009')
  await page.locator('input[type=checkbox]').check()
  await page.locator('.primary-login').click()
  await page.locator('.workbench-menu button').first().click()
  assert.equal(await page.locator('.capacity-card').count(), 5)
  assert.equal(await page.locator('.capacity-day').count(), 5)
  assert.equal(await page.locator('.capacity-month').count(), 5)
  assert.equal(await page.locator('.trend-svg').count(), 10)
  const firstCard = page.locator('.capacity-card').first()
  assert.ok((await firstCard.locator('.capacity-month .trend-current').getAttribute('d')).includes('L'))
  assert.equal(await firstCard.locator('.capacity-day .trend-point').count(), 2)
  assert.equal(await firstCard.locator('.capacity-month .trend-point').count(), 2)
  assert.equal(await page.locator('.trend-date-slider').count(), 0)
  assert.match(await firstCard.locator('.capacity-day .trend-svg').getAttribute('aria-label'), /周日均.*\d{4}-\d{2}-\d{2}/)
  for (const period of ['day', 'month']) assert.match(await firstCard.locator(`.capacity-${period} .capacity-comparison em`).textContent(), /较.* [+-]\d+(?:\.\d+)? 户\/日（[+-]\d+(?:\.\d+)?%）/)
  assert.match(await firstCard.locator('.capacity-month .trend-svg').getAttribute('aria-label'), /上月同期日均.*本月日均/)
  await firstCard.screenshot({ path: 'tests/capacity-product.png' })
  for (const width of [320, 390, 560, 1280]) {
    await page.setViewportSize({ width, height: 1000 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载模板' }).click()
  const stream = await (await downloadPromise).createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const csv = Buffer.concat(chunks).toString('utf8').replace(/^\ufeff/, '')
  assert.ok(csv.startsWith('gridId,productId,target,dailyTarget,targetDate'))
  await page.locator('input[type=file]').setInputFiles({ name: 'targets.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByText('已导入 15 条目标', { exact: true }).waitFor()
  await page.locator('.bottom-alert').click()
  assert.equal(await page.getByRole('combobox', { name: '生产类型', exact: true }).count(), 0)
  await page.getByRole('spinbutton', { name: '低产阈值' }).fill('100')
  for (const [label, expected] of [['直销人员', '直销队伍'], ['3星+渠道', '三星+渠道'], ['末梢渠道', '末梢渠道']]) {
    await page.getByRole('tab', { name: label, exact: true }).click()
    const cards = page.locator(label === '直销人员' ? '.person-card' : '.channel-card')
    const labels = await cards.evaluateAll(nodes => nodes.map(node => node.dataset.category))
    assert.ok(labels.length > 0 && labels.every(value => value === expected))
    for (const metadata of await page.locator(label === '直销人员' ? '.person-category' : '.channel-category').allTextContents()) {
      if (label === '直销人员') assert.match(metadata, /(?:装维随销|行销经理|商企经理) · S\d+/)
      else if (label === '3星+渠道') assert.match(metadata, /[345]星 · G\d+-S\d+/)
      else assert.match(metadata, /区域服务商/)
    }
    for (const organization of await page.locator('.list-section .alert-organization').allTextContents()) assert.match(organization, /分公司 · .*网格/)
    if (label === '末梢渠道') for (const name of await page.locator('.channel-head strong').allTextContents()) assert.match(name, /服务点/)
    await page.locator('.list-section').screenshot({ path: `tests/alert-details-${expected}.png` })
    const count = Number(await page.locator('.alert-summary > div').nth(label === '直销人员' ? 0 : label === '3星+渠道' ? 1 : 2).locator('strong').textContent())
    assert.equal(count, labels.length)
  }
  await page.getByRole('tab', { name: '3星+渠道', exact: true }).click()
  await page.getByRole('combobox', { name: '预警统计周期' }).selectOption('day')
  await page.screenshot({ path: 'tests/capacity-alert.png', fullPage: true })
  assert.deepEqual(errors, [])
  console.log('Daily/monthly cards, chart interaction, classification, target import, login cleanup and responsive checks passed.')
} finally { await browser.close() }
