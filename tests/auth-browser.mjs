import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import { mockFetchDashboard, mockFetchPermission } from '../src/api/mock.js'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.AUTH_PREVIEW_URL || 'http://127.0.0.1:5181/'
const phone = '13800000000'
const permission = await mockFetchPermission(phone)
const dashboard = await mockFetchDashboard({ phone })
dashboard.permission = permission
const output = new URL('../qa/', import.meta.url)
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  for (const scenario of ['sms', 'oneClick', 'sendFailure']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage(), calls = [], errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('https://gd.10086.cn/apph5/openapi/static/js/**', route => route.fulfill({ contentType: 'application/javascript', body: `
      window.JSEncrypt=class { setPublicKey() {} encrypt(s) { return 'RSA:'+s } };
      window.encryptAES=s=>s; window.decryptAES=s=>s;
      window.Login={login:ok=>ok({msgidKey:'TEST_MSG'})};
    ` }))
    await page.route('**/handle2-api', async route => {
      const payload = JSON.parse(route.request().postDataJSON().data)
      calls.push(payload)
      let data, includeData = true
      const service = payload.publicData.serviceId
      if (service === 'ability_acquire_send_code') {
        data = scenario === 'sendFailure' ? { status: '1', msg: '发送测试失败' } : null
        includeData = scenario === 'sendFailure'
      } else if (service === 'ability_acquire_valid_code') {
        data = payload.data.code === '123456' ? { status: '0', token: 'SMS_TOKEN' } : { status: '1', msg: '验证码测试错误' }
      } else if (service === 'ability_acquire_login') {
        data = { retCode: '0', data: { token: 'ONE_TOKEN', mobile: '138****0000' } }
      } else {
        const fun = payload.data.params.funCode
        const result = fun === 'wgsc_fetchPermission' ? permission : fun === 'wgsc_getMobileByToken' ? { mobile: phone } : dashboard
        data = { result: { result: { retCode: '0', data: result } } }
      }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ publicData: { retInfo: { retCode: 0 } }, ...(includeData ? { data: JSON.stringify(data) } : {}) }) })
    })
    await page.goto(base)
    await page.locator('.login-field input').first().fill(phone)
    await page.locator('.code-row button').click()
    assert.equal(calls.length, 0, 'consent must precede authentication requests')
    await page.locator('.login-agreement input').check()
    if (scenario === 'oneClick') {
      await page.locator('.quick-login').click()
      await page.locator('.workbench-heading').waitFor()
      assert.ok(calls.some(p => p.publicData.serviceId === 'ability_acquire_login' && p.data.msgidKey === 'TEST_MSG'))
      assert.ok(calls.some(p => p.data.params?.funCode === 'wgsc_getMobileByToken'))
    } else {
      await page.locator('.code-row button').click()
      if (scenario === 'sendFailure') {
        await page.getByText('发送测试失败', { exact: true }).waitFor()
        assert.equal(await page.locator('.workbench-heading').count(), 0)
        assert.equal(await page.locator('.code-row button').isEnabled(), true)
      } else {
        await page.locator('.code-row button').filter({ hasText: /\d+s/ }).waitFor()
        assert.equal(await page.locator('.code-row button').isDisabled(), true)
        await page.locator('.login-field input').nth(1).fill('654321')
        await page.locator('.primary-login').click()
        await page.getByText('验证码测试错误', { exact: true }).waitFor()
        assert.equal(await page.locator('.workbench-heading').count(), 0)
        await page.locator('.login-field input').nth(1).fill('123456')
        await page.locator('.primary-login').click()
        await page.locator('.workbench-heading').waitFor()
        const request = calls.find(p => p.publicData.serviceId === 'ability_acquire_valid_code')
        assert.equal(request.data.mobile, `RSA:${phone}`)
        assert.equal(request.publicData.version, '2.0')
        assert.ok(calls.some(p => p.data.params?.funCode === 'wgsc_fetchDashboard' && p.data.token === 'SMS_TOKEN'))
      }
    }
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    }
    assert.deepEqual(errors, [])
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: fileURLToPath(new URL(`auth-${scenario}.png`, output)), fullPage: true })
    console.log(`${scenario}: intercepted real-mode authentication and responsive checks passed`)
    await context.close()
  }
} finally { await browser.close() }
