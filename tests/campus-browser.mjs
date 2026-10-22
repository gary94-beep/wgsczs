import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright').catch(() => createRequire(process.execPath)('playwright'))
const browser = await chromium.launch({ channel: 'msedge', headless: true })
fs.mkdirSync('qa', { recursive: true })
const sheetContext = { console, Buffer }
vm.runInNewContext(fs.readFileSync('public/vendor/xlsx.full.min.js', 'utf8'), sheetContext)
const XLSX = sheetContext.XLSX
try {
  for (const [width, phone] of [[320, '13800000009'], [390, '13800000009'], [620, '13800000009'], [1280, '13800000000'], [390, '13800000003']]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, acceptDownloads: true })
    const errors = [], liveRequests = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route(/https:\/\/.*(?:10086\.cn|cmecloud\.cn)\//, route => { liveRequests.push(route.request().url()); return route.abort() })
    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5192/apph5_test/wgsczs/')
    await page.locator('.login-field input').first().fill(phone)
    await page.locator('.login-field input').nth(1).fill('123456')
    await page.locator('.login-agreement input').check()
    await page.locator('.primary-login').click()
    await page.getByRole('button', { name: '校园生产管理', exact: true }).click()
    const campus = page.getByRole('region', { name: '校园生产情况分析' })
    await campus.waitFor()
    if (phone.endsWith('03')) {
      await campus.locator('.campus-error').waitFor()
      assert.match(await campus.locator('.campus-error').innerText(), /权限/)
      assert.equal(await campus.locator('.campus-building').count(), 0)
      assert.equal(await campus.getByRole('button', { name: '导出数据', exact: true }).count(), 0)
    } else {
      await campus.locator('.campus-stats').waitFor()
      assert.equal(await campus.locator('.campus-demo').innerText(), '演示数据')
      assert.equal(await campus.locator('.campus-building').count(), 4)
      assert.equal(await campus.getByRole('progressbar').count(), 8)
      assert.deepEqual(await campus.locator('.campus-stats strong').allTextContents(), ['46%', '19%', '14'])
      assert.equal(await campus.locator('.campus-building button, .campus-building a').count(), 0)
      assert.equal(await campus.getByRole('button', { name: /去生产|进入生产登记/ }).count(), 0)
      await campus.getByLabel('当前学校').selectOption('ZK')
      assert.equal(await campus.locator('.campus-building').count(), 2)
      assert.deepEqual(await campus.locator('.campus-stats strong').allTextContents(), ['75%', '50%', '2'])
      await campus.getByRole('button', { name: '刷新分析', exact: true }).click()
      await campus.locator('.campus-stats').waitFor()
      assert.equal(await campus.getByLabel('当前学校').inputValue(), 'ZK')
      if (width === 390) {
        const progressDownload = page.waitForEvent('download')
        await campus.getByRole('button', { name: '导出进度', exact: true }).click()
        const progress = await progressDownload
        const workbook = XLSX.read(fs.readFileSync(await progress.path()), { type: 'buffer' })
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets['楼栋进度'], { header: 1 })
        assert.equal(rows.length, 3)
        assert.ok(rows.slice(1).every(r => r[0] === 'ZK'))
        await campus.getByRole('button', { name: '导出数据', exact: true }).click()
        const dialog = page.getByRole('dialog', { name: '导出校园数据' })
        await dialog.waitFor()
        await dialog.getByLabel('人员登记明细', { exact: true }).check()
        const detailDownload = page.waitForEvent('download')
        await dialog.getByRole('button', { name: '导出 Excel', exact: true }).click()
        const detail = await detailDownload
        const detailBook = XLSX.read(fs.readFileSync(await detail.path()), { type: 'buffer' })
        const detailRows = XLSX.utils.sheet_to_json(detailBook.Sheets['人员登记明细'], { header: 1 })
        assert.equal(detailRows.length, 9)
        await dialog.waitFor({ state: 'hidden' })
        await campus.getByRole('button', { name: '导出数据', exact: true }).click()
        await dialog.waitFor()
        await page.keyboard.press('Escape')
        await dialog.waitFor({ state: 'hidden' })
        await campus.getByLabel('当前学校').selectOption('GY')
        await page.screenshot({ path: 'qa/campus-analysis-mobile.png', fullPage: true })
      }
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    assert.deepEqual(errors, [])
    assert.deepEqual(liveRequests, [])
    await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '工作台', exact: true }).click()
    await page.locator('.workbench-menu').waitFor()
    await page.close()
    console.log(`${width}px/${phone.slice(-2)}: campus read-only analysis, school scope, authorization, exports and navigation passed`)
  }
} finally { await browser.close() }
