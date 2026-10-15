import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const context = {}
vm.runInNewContext(readFileSync(new URL('../public/vendor/xlsx.full.min.js', import.meta.url), 'utf8'), context)
const XLSX = context.XLSX
const output = new URL('../qa/', import.meta.url)
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  for (const [phone, role] of [['13800000000', 'city'], ['13800000001', 'branch'], ['13800000003', 'grid']]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true })
    const errors = [], external = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('request', r => { if (r.url().includes('cdn.jsdelivr.net')) external.push(r.url()) })
    await page.goto('http://127.0.0.1:5190/apph5_test/wgsczs/')
    await page.locator('.login-field input').first().fill(phone)
    await page.locator('.login-field input').nth(1).fill('123456')
    await page.locator('.login-agreement input').check()
    await page.locator('.primary-login').click()
    await page.locator('.workbench-menu').getByRole('button', { name: '生产总览', exact: true }).click()
    const analysis = page.locator('.operating-analysis'), board = page.locator('.production-board')
    await analysis.waitFor()
    assert.ok((await analysis.innerText()).includes('相对短板'))
    await board.getByRole('button', { name: '日', exact: true }).click()
    assert.ok((await analysis.innerText()).includes('当日'))
    await board.getByRole('button', { name: '月', exact: true }).click()
    await page.locator('.channel-type-filter select').selectOption('三星+渠道')
    assert.ok(!/完成率\s+\d/.test(await analysis.innerText()))
    assert.ok((await analysis.innerText()).includes('日均'))
    await page.locator('.channel-type-filter select').selectOption('')
    if (role === 'city') await page.screenshot({ path: fileURLToPath(new URL('operating-analysis.png', output)), fullPage: true })
    await page.locator('.breadcrumbs button').first().click()
    await page.locator('.workbench-menu').getByRole('button', { name: '预警监控', exact: true }).click()
    for (const kind of ['低产预警', '异动预警']) {
      await page.locator('.warning-menu').getByRole('button', { name: kind, exact: true }).click()
      if (kind === '低产预警') await page.getByRole('spinbutton', { name: '低产阈值', exact: true }).fill('100')
      else {
        await page.getByRole('spinbutton', { name: '日均减少率', exact: true }).fill('0')
        await page.getByRole('spinbutton', { name: '日均减少值', exact: true }).fill('0')
      }
      await page.getByRole('button', { name: '筛选', exact: true }).click()
      await page.locator('.alert-summary').waitFor()
      assert.equal(await page.locator('.alert-scale-column').count(), 3)
      assert.equal(await page.locator('.alert-summary').getByText(kind, { exact: true }).count(), 3)
      assert.equal(await page.locator('.alert-summary').getByText(`${kind}率`, { exact: true }).count(), 3)
      const statistics = await page.locator('.alert-scale-column').evaluateAll(nodes => nodes.map(el => ({
        total: Number(el.querySelector('.summary-total-count').textContent.replace(/[^\d.]/g, '')),
        count: Number(el.querySelector('.summary-warning-count').textContent.replace(/[^\d.]/g, '')),
        rate: el.querySelector('.summary-warning-rate').textContent
      })))
      for (const stat of statistics) {
        assert.ok(stat.count <= stat.total)
        assert.equal(stat.rate, stat.total ? `${Math.round(stat.count / stat.total * 1000) / 10}%` : '—')
      }
      await page.getByRole('button', { name: '导出Excel', exact: true }).waitFor()
      const count = (await page.locator('.alert-summary .summary-warning-count').allTextContents()).reduce((sum, n) => sum + Number(n.replace(/[^\d.]/g, '')), 0)
      const pending = page.waitForEvent('download')
      await page.getByRole('button', { name: '导出Excel', exact: true }).click()
      const download = await pending
      assert.match(download.suggestedFilename(), /\.xlsx$/)
      const path = fileURLToPath(new URL(`export-${role}-${kind}.xlsx`, output))
      await download.saveAs(path)
      const workbook = XLSX.read(await fs.readFile(path), { type: 'buffer' })
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets['预警结果'], { header: 1, defval: '' })
      assert.equal(rows.length - 1, count)
      for (const row of rows.slice(1)) {
        assert.equal(row[21], '未登记')
        assert.equal(row[1], '模拟数据')
        if (role === 'branch') assert.equal(row[3], '城区分公司')
        if (role === 'grid') assert.equal(row[4], '城区一网格')
      }
      const metadata = XLSX.utils.sheet_to_json(workbook.Sheets['筛选条件'], { header: 1 })
      assert.equal(metadata.find(row => row[0] === '预警类型')[1], kind)
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 })
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${role}/${kind}/${width}`)
      }
      await page.setViewportSize({ width: 390, height: 844 })
      if (role === 'city' && kind === '低产预警') await page.screenshot({ path: fileURLToPath(new URL('export-action.png', output)), fullPage: true })
      if (role === 'city' && kind === '异动预警') await page.screenshot({ path: fileURLToPath(new URL('warning-scales.png', output)), fullPage: true })
      await page.getByRole('button', { name: '预警监控', exact: true }).first().click()
    }
    assert.deepEqual(errors, [])
    assert.deepEqual(external, [])
    console.log(`${role}: deterministic analysis and both XLSX exports passed; no external CDN`)
    await page.close()
  }
} finally { await browser.close() }
