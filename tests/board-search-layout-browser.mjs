import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createRequire} from 'node:module'
const {chromium}=createRequire(process.execPath)('playwright')
const base=process.env.BASE_URL||'http://127.0.0.1:5192/apph5_test/wgsczs/'
const browser=await chromium.launch({channel:'msedge',headless:true})
await fs.mkdir('qa',{recursive:true})
try {
  for(const width of [320,390,620,1280]) {
    const page=await browser.newPage({viewport:{width,height:1000}})
    const errors=[],missingAssets=[]
    page.on('pageerror',e=>errors.push(e.message))
    page.on('response',r=>{if(r.url().includes('.svg')&&r.status()>=400)missingAssets.push(r.url())})
    await page.goto(base)
    await page.locator('.login-field input').first().fill('13800000009')
    await page.locator('.login-field input').nth(1).fill('123456')
    await page.locator('.login-agreement input').check()
    await page.locator('.primary-login').click()
    await page.locator('.workbench-menu').waitFor()
    await page.locator('.workbench-menu').getByRole('button',{name:'生产总览',exact:true}).click()
    await page.locator('.production-board').waitFor()
    assert.equal(await page.locator('.board-row').count(),4)
    assert.equal(await page.locator('.board-product-icon').count(),4)
    assert.equal(await page.locator('.board-target-chip').count(),12)
    assert.equal(await page.locator('.production-board .dual-track').count(),0)
    const layout=await page.locator('.board-row').first().evaluate(n=>{
      const product=n.querySelector('.board-product').getBoundingClientRect(),value=n.querySelector('.board-value').getBoundingClientRect(),chips=[...n.querySelectorAll('.board-target-chip')].map(n=>n.getBoundingClientRect())
      return {clear:product.right<=value.left,below:chips[0].top>=Math.max(product.bottom,value.bottom),inline:chips.every(r=>Math.abs(r.top-chips[0].top)<1)}
    })
    assert.ok(layout.clear&&layout.below&&layout.inline)
    await page.getByRole('button',{name:'日',exact:true}).click()
    assert.equal(await page.getByRole('button',{name:'日',exact:true}).getAttribute('aria-pressed'),'true')
    await page.getByRole('button',{name:'月',exact:true}).click()
    if(width===390) await page.locator('.production-board').screenshot({path:'qa/board-reference-390.png'})
    await page.locator('.channel-type-filter select').first().selectOption({label:'三星+渠道'})
    assert.equal(await page.locator('.board-target-chip').count(),0)
    await page.locator('.channel-type-filter select').first().selectOption('')
    await page.locator('.board-row').first().click()
    await page.locator('.production-drill-title').waitFor()
    await page.locator('.breadcrumbs').getByRole('button',{name:'工作台',exact:true}).click()
    await page.locator('.workbench-menu').getByRole('button',{name:'产能速查',exact:true}).click()
    assert.equal(await page.getByRole('heading',{name:'产能速查',exact:true}).count(),1)
    assert.equal(await page.locator('select[aria-label="查询产品"] option').count(),5)
    const input=page.locator('input[type=search]')
    await input.fill('梁敏')
    await page.locator('.search-result').first().waitFor()
    assert.equal(await page.locator('.search-avatar-people').count(),1)
    assert.equal(await page.locator('.search-result').first().locator('tbody tr').count(),4)
    assert.match(await page.locator('.search-identity-meta').first().innerText(),/S001/)
    assert.equal(await page.getByText('千兆运营',{exact:true}).count(),0)
    if(width===390) {await page.locator('.search-page-heading').scrollIntoViewIfNeeded();await page.screenshot({path:'qa/search-person-reference-390.png',fullPage:true})}
    await page.getByRole('button',{name:'渠道',exact:true}).click()
    await input.fill('西区')
    await page.locator('.search-result').first().waitFor()
    assert.ok(await page.locator('.search-avatar-channels').count()>0)
    if(width===390) {await page.locator('.search-page-heading').scrollIntoViewIfNeeded();await page.screenshot({path:'qa/search-channel-reference-390.png',fullPage:true})}
    await page.getByRole('combobox',{name:'查询产品'}).selectOption('terminal')
    await page.waitForFunction(()=>[...document.querySelectorAll('.search-result tbody')].every(n=>n.children.length===1)&&document.querySelectorAll('.search-result tbody').length>0)
    await page.getByRole('button',{name:'清空搜索'}).click()
    assert.equal(await page.locator('.search-result').count(),0)
    await input.fill('没有这个渠道XYZ')
    await page.locator('.search-empty').waitFor()
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    assert.deepEqual(errors,[])
    assert.deepEqual(missingAssets,[])
    await page.close();console.log(`${width}px: board layout, three rates, period switch, category targets, drilldown, people/channel search, filter and empty state passed`)
  }
} finally {await browser.close()}
