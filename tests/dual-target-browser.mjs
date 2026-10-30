import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
const {chromium}=createRequire(process.execPath)('playwright')
const base=process.env.BASE_URL || 'http://127.0.0.1:5192/apph5_test/wgsczs/'
const browser=await chromium.launch({channel:'msedge',headless:true})
await fs.mkdir('qa',{recursive:true})
try {
  for (const width of [320,390,620,1280]) {
    const page=await browser.newPage({viewport:{width,height:1000}})
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await page.goto(base+'tests/dual-target-preview.html')
    await page.locator('.capacity-actual').first().waitFor()
    assert.equal(await page.locator('.dual-track').count(),2)
    assert.equal(await page.locator('.dual-min-marker').count(),2)
    assert.match(await page.locator('.capacity-day .target-rates').innerText(),/112.5%[\s\S]*90%[\s\S]*75%/)
    assert.match(await page.locator('.capacity-month .target-rates').innerText(),/150%[\s\S]*112.5%[\s\S]*90%/)
    assert.match(await page.locator('.capacity-day .target-rates').innerText(),/90%[\s\S]*75%/)
    assert.match(await page.locator('.capacity-month .target-rates').innerText(),/112.5%[\s\S]*90%/)
    const check=async()=>{
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
      for(const period of ['day','month']) {
        const geometry=await page.locator(`.capacity-${period}`).evaluate(n=>{
          const h=n.querySelector('.capacity-period-heading').getBoundingClientRect(),v=n.querySelector('.capacity-actual').getBoundingClientRect()
          const metrics=[...n.querySelectorAll('.capacity-comparison > span')].map(n=>n.getBoundingClientRect())
          const trend=n.querySelector('.capacity-comparison em').getBoundingClientRect()
          return {overlap:h.right>v.left,aligned:Math.abs(metrics[0].top-metrics[1].top)<2,separate:trend.top>=Math.max(...metrics.map(n=>n.bottom))}
        })
        assert.equal(geometry.overlap,false)
        assert.ok(geometry.aligned&&geometry.separate)
      }
    }
    await check()
    if(width===390) await page.screenshot({path:'qa/dual-target-card-390.png',fullPage:true})
    for(const values of [[0,0,0,0],[null,null,null,null],[500,300,null,200],[500,null,600,200],[500,null,null,200],[999999999,1000000000,1000000001,999999998],[300,300,300,300]]) {
      await page.evaluate(v=>window.setTargetCase(...v),values)
      await check()
      assert.ok(!/NaN|Infinity/.test(await page.locator('.capacity-card').innerText()))
    }
    assert.deepEqual(errors,[])
    await page.close();console.log(`${width}px fixture: rates, marker, right-aligned numbers, gaps, trend and missing/zero/large values passed`)
  }
  for(const phone of ['13800000009','13800000001','13800000003']) {
    const page=await browser.newPage({viewport:{width:390,height:1000},acceptDownloads:true})
    await page.goto(base)
    await page.locator('.login-field input').first().fill(phone)
    await page.locator('.login-field input').nth(1).fill('123456')
    await page.locator('.login-agreement input').check()
    await page.locator('.primary-login').click()
    await page.locator('.workbench-menu').waitFor()
    await page.locator('.workbench-menu button').first().click()
    await page.locator('.production-board').waitFor()
    assert.equal(await page.locator('.capacity-card').count(),4)
    assert.equal(await page.locator('.capacity-card .dual-track').count(),8)
    assert.equal(await page.getByText('千兆运营',{exact:true}).count(),0)
    await page.locator('.capacity-card').first().scrollIntoViewIfNeeded()
    if(phone.endsWith('09')) await page.screenshot({path:'qa/dual-target-overview-390.png',fullPage:true})
    await page.locator('.channel-type-filter select').first().selectOption({label:'三星+渠道'})
    assert.equal(await page.locator('.dual-target').count(),0)
    await page.locator('.channel-type-filter select').first().selectOption('')
    await page.locator('.capacity-card-heading').first().click()
    if(phone.endsWith('03')) await page.locator('.list-section').waitFor()
    else {
      await page.locator('.production-drill-title').waitFor()
      assert.ok(await page.locator('.capacity-card .dual-target').count()>0)
    }
    if(phone.endsWith('09')) {
      await page.locator('.breadcrumbs').getByRole('button',{name:'工作台',exact:true}).click()
      await page.getByRole('button',{name:'数据导入',exact:true}).click()
      const row=page.locator('.import-nav-item').filter({hasText:'产品目标表'})
      const download=page.waitForEvent('download')
      await row.getByRole('button',{name:'下载模板',exact:true}).click()
      const stream=await (await download).createReadStream(),chunks=[]
      for await(const chunk of stream) chunks.push(chunk)
      const csv=Buffer.concat(chunks).toString('utf8')
      assert.ok(csv.replace(/^\ufeff/,'').startsWith('id,branch,grid,product_id,target_month,month_min_target,month_base_target,month_challenge_target,day_min_target,day_base_target,day_challenge_target,target_date'))
      const choose=page.waitForEvent('filechooser')
      await row.getByRole('button',{name:'导入数据',exact:true}).click()
      await (await choose).setFiles({name:'targets.csv',mimeType:'text/csv',buffer:Buffer.from(csv)})
      await page.getByText('已导入 12 条目标',{exact:true}).waitFor()
      console.log('Admin template download -> CSV import -> dashboard refresh passed')
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    await page.close();console.log(`${phone.slice(-2)} role: mock login, real overview, channel target hiding and drilldown passed`)
  }
} finally {await browser.close()}
