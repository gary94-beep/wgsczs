import test from 'node:test'
import assert from 'node:assert/strict'
import {isVisibleProduct,visibleDashboard,visibleSearchResults,visibleAnalysis} from '../src/utils/productVisibility.js'
import {targetTemplateCsv} from '../src/utils/imports/targets.js'
const visible={productId:'newNumbers',productName:'放号'}
const hidden={productId:'gigabit',productName:'千兆运营'}

test('legacy product labels normalize across dashboard, searches and AI without changing IDs or source data',()=>{
  const old={productId:'plan119',productName:'119+套餐',production:7}
  const dashboard=visibleDashboard({products:[old],rows:[old]})
  assert.equal(dashboard.products[0].productName,'129+高套')
  assert.equal(dashboard.rows[0].productId,'plan119')
  assert.equal(dashboard.rows[0].production,7)
  assert.equal(old.productName,'119+套餐')
  assert.equal(visibleSearchResults({results:[{values:[old]}]}).results[0].values[0].productName,'129+高套')
  assert.equal(visibleAnalysis({rows:[{answer:'优势：119+套餐达标，高套（129+）增长。'}]}).rows[0].answer,'优势：129+高套达标，129+高套增长。')
})
test('hidden product matches IDs and names without hiding other broadband products',()=>{
  assert.equal(isVisibleProduct(hidden),false)
  assert.equal(isVisibleProduct({product_id:'gigabit'}),false)
  assert.equal(isVisibleProduct({product_name:'千兆运营'}),false)
  assert.equal(isVisibleProduct({productId:'homeBroadband',productName:'手宽新增'}),true)
})
test('dashboard filters catalogs and all product arrays without mutating stored data or metadata',()=>{
  const source={organization:{grids:[]},permission:{role:'grid'},statDate:'2026-10-30'}
  for(const key of ['products','targets','rows','dailyRows','regionRows','periodRows','salesScripts']) source[key]=[visible,hidden]
  const filtered=visibleDashboard(source)
  for(const key of ['products','targets','rows','dailyRows','regionRows','periodRows','salesScripts']) {
    assert.equal(filtered[key].length,1);assert.equal(source[key].length,2)
  }
  assert.equal(filtered.permission,source.permission)
  assert.equal(visibleDashboard({products:[]}).regionRows,undefined)
})
test('all-product capacity searches do not leak hidden nested metrics',()=>{
  const source={statDate:'2026-10-30',results:[{name:'A',values:[visible,hidden]},{name:'B',values:[hidden]}]}
  const filtered=visibleSearchResults(source)
  assert.equal(filtered.results.length,1)
  assert.deepEqual(filtered.results[0].values,[visible])
  assert.equal(source.results[0].values.length,2)
})
test('AI conclusions containing hidden products are suppressed, not partially rewritten',()=>{
  const data={rows:[{answer:'总体情况：放号达标。'},{answer:'优势：千兆运营完成90%。'},{answer:'gigabit 90%'},{...hidden,answer:'进度正常'}]}
  assert.deepEqual(visibleAnalysis(data).rows,[data.rows[0]])
})
test('new target downloads exclude hidden products but retain other goals',()=>{
  const dashboard=visibleDashboard({statDate:'2026-10-30',organization:{branches:[{branchId:'B',branchName:'城区分公司'}],grids:[{gridId:'B::东区',gridName:'东区',branchId:'B'}]},products:[visible,hidden],targets:[]})
  const csv=targetTemplateCsv(dashboard)
  assert.ok(csv.includes('newNumbers'))
  assert.ok(!/gigabit|千兆运营/.test(csv))
})
