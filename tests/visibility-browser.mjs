import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
const {chromium}=createRequire(process.execPath)('playwright')
const base=process.env.BASE_URL||'http://127.0.0.1:5192/apph5_test/wgsczs/'
const browser=await chromium.launch({channel:'msedge',headless:true})
await fs.mkdir('qa',{recursive:true})
try {
  for(const width of [320,390,620,1280]) {
    const page=await browser.newPage({viewport:{width,height:1000}})
    await page.goto(base+'tests/dual-target-preview.html')
    await page.locator('.target-marker-label').first().waitFor()
    for(const values of [null,[999999999,1000000000,1000000001,999999998],[300,300,300,300]]) {
      if(values) await page.evaluate(v=>window.setTargetCase(...v),values)
      for(const period of ['day','month']) {
        const geometry=await page.locator(`.capacity-${period} .target-marker-label`).evaluate(n=>{
          const r=[...n.children].map(el=>el.getBoundingClientRect())
          return {aligned:Math.abs(r[0].top-r[1].top)<1,clear:r[0].right<=r[1].left}
        })
        assert.ok(geometry.aligned&&geometry.clear,JSON.stringify({width,geometry}))
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
      if(width===390&&!values) await page.screenshot({path:'qa/aligned-target-labels-390.png',fullPage:true})
    }
    await page.close();console.log(`${width}px: target labels share one line, no collisions or overflow`)
  }
  const page=await browser.newPage({viewport:{width:390,height:1000}})
  // Test all five genuine names plus excluded organizations, without modifying project demo data.
  await page.route('**/src/data/mockData.js*',async route=>{
    const response=await route.fetch()
    const extra=['南部分公司','北部分公司','高新分公司','东部分公司','市统筹','其他分公司']
    await route.fulfill({response,body:await response.text()+`\nmockBranches.push(...${JSON.stringify(extra.map(name=>({branchId:name,branchName:name})))});`})
  })
  await page.goto(base)
  await page.locator('.login-field input').first().fill('13800000009')
  await page.locator('.login-field input').nth(1).fill('123456')
  await page.locator('.login-agreement input').check()
  await page.locator('.primary-login').click()
  await page.locator('.workbench-menu').waitFor()
  await page.locator('.workbench-menu').getByRole('button',{name:'生产总览',exact:true}).click()
  await page.locator('.production-board').waitFor()
  assert.equal(await page.locator('.capacity-card').count(),4)
  assert.equal(await page.getByText('千兆运营',{exact:true}).count(),0)
  await page.locator('.breadcrumbs').getByRole('button',{name:'工作台',exact:true}).click()
  await page.locator('.workbench-menu').getByRole('button',{name:'产能速查',exact:true}).click()
  assert.equal(await page.locator('select[aria-label="查询产品"] option').filter({hasText:'千兆运营'}).count(),0)
  await page.locator('input[type=search]').fill('梁敏')
  await page.locator('.search-result').first().waitFor()
  assert.ok(!/千兆运营/.test(await page.locator('.search-result').first().innerText()))
  for(const mode of ['低产预警','异动预警']) {
    await page.locator('.bottom-alert').click()
    await page.locator('.warning-menu').getByRole('button',{name:mode,exact:true}).click()
    await page.locator('.filter-card').waitFor()
    const labels=await page.locator('.monitor-filter').filter({hasText:'分公司'}).locator('select option').allTextContents()
    assert.deepEqual(labels.map(s=>s.trim()),['全市','南部分公司','北部分公司','城区分公司','高新分公司','东部分公司'])
    assert.equal(await page.locator('.script-library-entry').count(),0)
    assert.equal(await page.getByText('经典话术库',{exact:true}).count(),0)
    assert.equal(await page.getByText('千兆运营',{exact:true}).count(),0)
    if(mode==='低产预警') await page.screenshot({path:'qa/visible-alert-filters-390.png',fullPage:true})
  }
  await page.locator('.breadcrumbs').getByRole('button',{name:'工作台',exact:true}).click()
  await page.getByRole('button',{name:'数据导入',exact:true}).click()
  assert.equal(await page.getByText('经典话术表',{exact:true}).count(),0)
  await page.close()
  console.log('Overview, capacity search, both alert menus and import navigation visibility passed')
} finally {await browser.close()}
