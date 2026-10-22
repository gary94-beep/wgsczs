import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage()
  for (const width of [320, 390, 620, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5192/apph5_test/wgsczs/')
    const heading = page.locator('.brand-panel .brand-lockup')
    await heading.waitFor()
    const metrics = await heading.evaluate(async el => {
      const r = el.getBoundingClientRect(), card = document.querySelector('.login-card').getBoundingClientRect()
      return { left: r.left, right: r.right, bottom: r.bottom, cardTop: card.top,
        width: document.documentElement.clientWidth, color: getComputedStyle(el.querySelector('.brand-ai')).color,
        italic: getComputedStyle(el.querySelector('.brand-ai')).fontStyle, gap: getComputedStyle(el.querySelector('.brand-ai')).marginRight, before: getComputedStyle(el.querySelector('h1'), '::before').display }
    })
    assert.equal(metrics.color, 'rgb(40, 116, 238)')
    assert.equal(metrics.italic, 'italic')
    assert.equal(metrics.gap, '7px')
    assert.equal(metrics.before, 'none')
    assert.ok(metrics.left >= 0 && metrics.right <= metrics.width && metrics.bottom < metrics.cardTop)
    assert.equal(await heading.getByRole('heading', { name: '网格生产AI助手', exact: true }).count(), 1)
    assert.equal(await page.locator('.brand-mark').count(), 0)
    if (width === 390) await page.screenshot({ path: 'qa/brand-reference-login.png', fullPage: true })
    await page.locator('.login-field input').first().fill('13800000009')
    await page.locator('.login-field input').nth(1).fill('123456')
    await page.locator('.login-agreement input').check()
    await page.locator('.primary-login').click()
    await page.locator('.top-bar .brand-lockup h1').waitFor()
    assert.equal(await page.locator('.top-bar .brand-lockup h1').innerText(), '网格生产AI助手')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    if (width === 390) await page.screenshot({ path: 'qa/brand-reference-workbench.png', fullPage: true })
    console.log(width + 'px: reference typography and green accent verified, no overflow')
  }
} finally { await browser.close() }
