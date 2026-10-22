import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright').catch(() => createRequire(process.execPath)('playwright'))
const base = process.env.BASE_URL || 'http://127.0.0.1:5192/apph5_test/wgsczs/'
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
fs.mkdirSync('qa', { recursive: true })
try {
  for (const [width, phone] of [[320, '13800000009'], [390, '13800000009'], [620, '13800000009'], [1280, '13800000009'], [390, '13800000001'], [390, '13800000003']]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    const errors = [], network = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route(/https:\/\/.*(?:10086\.cn|cmecloud\.cn)\//, route => { network.push(route.request().url()); return route.abort() })
    await page.goto(base)
    const heading = page.locator('.brand-panel h1')
    await heading.waitFor()
    assert.equal(await heading.innerText(), '网格生产AI助手')
    assert.equal(await page.title(), '网格生产AI助手')
    const ai = heading.locator('.brand-ai')
    assert.deepEqual(await ai.evaluate(n => ({ color: getComputedStyle(n).color, italic: getComputedStyle(n).fontStyle, gap: getComputedStyle(n).marginRight })), { color: 'rgb(40, 116, 238)', italic: 'italic', gap: '7px' })
    assert.equal(await page.locator('.login-card').evaluate(n => getComputedStyle(n).marginTop), '136px')
    assert.equal(await page.locator('.demo-accounts button').count(), 4)
    const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    await noOverflow()
    if (width === 390 && phone.endsWith('09')) await page.screenshot({ path: 'qa/source-login-390.png', fullPage: true })
    await page.locator('.login-field input').first().fill(phone)
    await page.locator('.login-field input').nth(1).fill('123456')
    await page.locator('.login-agreement input').check()
    await page.locator('.primary-login').click()
    await page.locator('.workbench-menu').waitFor()
    assert.equal(await page.locator('.top-bar h1').innerText(), '网格生产AI助手')
    await noOverflow()
    await page.locator('.workbench-menu button').first().click()
    await page.locator('.ai-analysis-sections').waitFor()
    assert.equal(await page.locator('.operating-analysis').count(), 0)
    assert.equal(await page.locator('.bottom-staff-board').count(), 0)
    assert.equal(await page.locator('.ai-analysis-error').count(), 0)
    const content = page.locator('.ai-analysis-sections')
    assert.deepEqual(await content.locator('strong').allTextContents(), ['总体情况：', '优势：', '短板：'])
    assert.deepEqual(await content.locator('strong').evaluateAll(nodes => nodes.map(n => getComputedStyle(n).color)), ['rgb(17, 17, 17)', 'rgb(9, 157, 135)', 'rgb(200, 114, 40)'])
    assert.ok(await content.locator('strong').evaluateAll(nodes => nodes.every(n => Number(getComputedStyle(n).fontWeight) >= 700)))
    assert.equal(await content.locator('.ai-demo-notice').innerText(), '演示分析')
    if (width === 390 && phone.endsWith('09')) { await content.scrollIntoViewIfNeeded(); await page.screenshot({ path: 'qa/source-analysis-390.png' }) }
    const filter = page.locator('.overview-heading .channel-type-filter')
    const filterGeometry = await filter.evaluate(n => { const label = n.querySelector('span').getBoundingClientRect(), select = n.querySelector('select').getBoundingClientRect(); return { gap: select.left - label.right, center: Math.abs((label.top + label.bottom - select.top - select.bottom) / 2) } })
    assert.ok(filterGeometry.gap >= 4 && filterGeometry.center < 3)
    await noOverflow()
    if (phone.endsWith('09')) {
      await page.locator('.production-board .board-row').nth(1).click()
      await page.locator('.production-drill-title').waitFor()
      const overlap = await page.locator('.production-drill-title').evaluate(n => n.querySelector('h2').getBoundingClientRect().right > n.querySelector('label').getBoundingClientRect().left)
      assert.equal(overlap, false)
      await noOverflow()
      await page.locator('.drill-list .capacity-card-heading').first().click()
      await page.locator('.ai-analysis-sections').waitFor()
      assert.equal(await page.locator('.ai-section').count(), 3)
    }
    assert.deepEqual(errors, [])
    assert.deepEqual(network, [])
    await page.close()
    console.log(`${width}px/${phone.slice(-2)}: source branding, mock login, AI formatting, scope and layout passed`)
  }
} finally { await browser.close() }
