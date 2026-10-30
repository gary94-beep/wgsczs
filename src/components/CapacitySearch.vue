<template>
  <section class="capacity-search" aria-label="人员渠道产能查询">
    <header class="search-page-heading"><div><h2>产能速查</h2><p>个人 / 渠道产能查询</p></div><div class="search-page-meta"><span class="search-scope"><i class="search-ui-icon" :style="iconStyle('location')" aria-hidden="true"></i>{{ scope }}</span><span v-if="demo" class="search-demo">演示数据</span></div></header>
    <div class="search-toolbar">
      <div class="search-controls"><div class="search-kinds" role="group" aria-label="搜索对象"><button v-for="item in kinds" :key="item.id" type="button" :aria-pressed="kind === item.id" :class="{ active: kind === item.id }" @click="kind = item.id; limit = 10">{{ item.label }}</button></div><select v-model="productId" aria-label="查询产品"><option value="">全部产品</option><option v-for="item in dashboard.products" :key="item.productId" :value="item.productId">{{ item.productName }}</option></select></div>
      <div class="search-input"><i class="search-ui-icon" :style="iconStyle('search')" aria-hidden="true"></i><input v-model="query" type="search" maxlength="100" :placeholder="kind === 'people' ? '搜索姓名 / 员工工号' : '搜索渠道名称 / 渠道编码'" :aria-label="kind === 'people' ? '搜索姓名或工号' : '搜索渠道名称或编码'" @keydown.esc="query = ''" /><button v-if="query" type="button" title="清空搜索" aria-label="清空搜索" @click="query = ''"><i class="search-ui-icon" :style="iconStyle('clear')" aria-hidden="true"></i></button></div>
    </div>
    <p v-if="error" class="search-error" role="alert">{{ error }}</p>
    <template v-if="query.trim()"><div class="search-result-heading" aria-live="polite"><span>{{ busy ? '查询中...' : `共 ${results.length} ${kind === 'people' ? '位人员' : '个渠道'}` }}</span><time>截至 {{ dashboard.statDate }}</time></div><p v-if="!busy && !error && !results.length" class="search-empty">当前可查看范围内暂无匹配结果</p>
      <article v-for="item in results.slice(0, limit)" :key="item.key" class="search-result">
        <header class="search-identity"><span class="search-avatar" :class="`search-avatar-${kind}`" aria-hidden="true"><i class="search-ui-icon" :style="iconStyle(kind === 'people' ? 'person' : 'store')"></i></span><div class="search-identity-copy"><h3>{{ item.name }}</h3><div class="search-identity-meta"><span class="search-role">{{ item.role || '类型未提供' }}</span><span class="search-code">{{ item.code || '编码未提供' }}</span></div><p>{{ branchName(item.branchId) }} · {{ gridName(item.gridId) }}</p></div></header>
        <div class="search-table-wrap"><table class="search-metrics" :aria-label="`${item.name}产能`"><thead><tr class="search-metric-head"><th scope="col">产品</th><th scope="col">当日</th><th scope="col">本月</th></tr></thead><tbody><tr v-for="metric in item.values" :key="metric.productId"><th scope="row">{{ metric.productName }}</th><td :class="{ 'metric-muted': metric.day == null || metric.day === 0 }">{{ format(metric.day) }}<small v-if="metric.day != null"> {{ metric.unit }}</small></td><td :class="{ 'metric-muted': metric.month == null || metric.month === 0 }">{{ format(metric.month) }}<small v-if="metric.month != null"> {{ metric.unit }}</small></td></tr></tbody></table></div>
      </article>
      <button v-if="results.length > limit" class="search-more" type="button" @click="limit += 10">查看更多</button>
    </template>
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { searchCapacity } from '../utils/capacitySearch.js'
import searchIcon from '../assets/ui-icons/search.svg'
import clearIcon from '../assets/ui-icons/x.svg'
import locationIcon from '../assets/ui-icons/map-pin.svg'
import storeIcon from '../assets/ui-icons/store.svg'
import personIcon from '../assets/ui-icons/user-round.svg'
const props = defineProps({ dashboard: Object, gridIds: Array, scope: String, demo: Boolean, queryApi: Function, channelType: { type: String, default: '' } })
const query = ref(''), kind = ref('people'), productId = ref(''), limit = ref(10)
const kinds = [{ id: 'people', label: '人员' }, { id: 'channels', label: '渠道' }]
const remoteResults = ref([]), error = ref(''), busy = ref(false)
const results = computed(() => props.queryApi ? remoteResults.value : searchCapacity(props.dashboard, { query: query.value, kind: kind.value, productId: productId.value, gridIds: props.gridIds, channelType: props.channelType }))
let sequence = 0
watch([query, kind, productId, () => JSON.stringify(props.gridIds), () => props.channelType], (values, previous, cleanup) => {
  const id = ++sequence
  remoteResults.value = []; error.value = ''; busy.value = false
  if (!props.queryApi || !query.value.trim()) return
  const params = { query: query.value, kind: kind.value, productId: productId.value, gridIds: props.gridIds, channelType: props.channelType }
  busy.value = true
  const timer = setTimeout(async () => {
    try { const data = await props.queryApi(params); if (id === sequence) remoteResults.value = data.results || [] }
    catch (e) { if (id === sequence) error.value = e.message || '查询失败' }
    finally { if (id === sequence) busy.value = false }
  }, 250)
  cleanup(() => { clearTimeout(timer); sequence++ })
})
watch([query, productId, () => props.channelType], () => { limit.value = 10 })
watch(() => JSON.stringify(props.gridIds), () => { query.value = ''; limit.value = 10 })
const branchName = id => props.dashboard.organization.branches.find(item => item.branchId === id)?.branchName || '分公司未提供'
const gridName = id => props.dashboard.organization.grids.find(item => item.gridId === id)?.gridName || '网格未提供'
const iconStyle = name => ({ '--search-icon': `url("${({ search: searchIcon, clear: clearIcon, location: locationIcon, store: storeIcon, person: personIcon })[name]}")` })
const format = value => value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
</script>
<style scoped>
.capacity-search { padding: 20px 14px 30px; color: #142349; }
.search-page-heading { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin: 0 4px 22px; }
.search-page-heading h2 { margin: 0; color: #142349; font-size: 28px; line-height: 1.3; }
.search-page-heading p { margin: 7px 0 0; color: #607998; font-size: 14px; }
.search-page-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; color: #607998; font-size: 12px; }
.search-scope { display: inline-flex; align-items: center; gap: 5px; }
.search-demo { padding: 3px 7px; border: 1px solid #cce1ff; border-radius: 4px; color: #2674e8; background: #eaf3ff; }
.search-ui-icon { display: inline-block; flex: 0 0 20px; width: 20px; height: 20px; background: currentColor; mask: var(--search-icon) center / contain no-repeat; -webkit-mask: var(--search-icon) center / contain no-repeat; }
.search-page-meta .search-ui-icon { width: 15px; height: 15px; flex-basis: 15px; }
.search-toolbar { padding: 16px; border: 1px solid #e1edf8; border-radius: 8px; background: #fff; }
.search-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
button, input, select { font: inherit; } button { cursor: pointer; }
.search-kinds { display: flex; flex: 0 0 auto; border-radius: 5px; background: #eaf3ff; }
.search-kinds button { width: 65px; height: 38px; padding: 0 8px; border: 0; border-radius: 5px; background: transparent; color: #607998; font-size: 15px; font-weight: 700; }
.search-kinds .active { color: #fff; background: #1672fa; }
.search-controls select { min-width: 0; width: 124px; height: 38px; padding: 0 10px; border: 1px solid #bedaff; border-radius: 5px; color: #142349; background: #fff; font-size: 14px; }
.search-input { display: flex; align-items: center; gap: 8px; padding: 0 10px 0 13px; border: 1px solid #86b5ff; border-radius: 6px; background: #fcfeff; }
.search-input > .search-ui-icon { color: #1559ac; }
.search-input:focus-within { outline: 2px solid #bad7ff; outline-offset: 1px; }
.search-input input { box-sizing: border-box; width: 100%; min-width: 0; height: 48px; padding: 0; border: 0; outline: none; background: transparent; color: #142349; font-size: 16px; }
.search-input input::-webkit-search-cancel-button { display: none; }
.search-input button { display: grid; place-items: center; width: 30px; height: 30px; flex: 0 0 30px; padding: 5px; border: 0; border-radius: 50%; color: #607998; background: #edf1f6; }
.search-result-heading { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin: 18px 4px 12px; font-size: 12px; color: #607998; }
.search-empty { padding: 22px 0; color: #7188a0; font-size: 14px; text-align: center; }
.search-error { color: #b9343d; font-size: 13px; line-height: 1.6; }
.search-result { margin-top: 14px; padding: 18px 16px; border: 1px solid #e1edf8; border-radius: 8px; background: #fff; }
.search-identity { display: flex; align-items: flex-start; gap: 12px; }
.search-avatar { display: grid; place-items: center; flex: 0 0 48px; width: 48px; height: 48px; border-radius: 50%; color: #1672fa; background: #e8f3ff; }
.search-avatar .search-ui-icon { width: 30px; height: 30px; }
.search-identity-copy { flex: 1; min-width: 0; }
.search-identity h3 { margin: 0; color: #142349; font-size: 18px; line-height: 1.5; overflow-wrap: anywhere; }
.search-identity-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; margin-top: 5px; font-size: 12px; }
.search-role { padding: 1px 6px; border: 1px solid #c5dfff; border-radius: 4px; color: #1672fa; background: #edf6ff; line-height: 1.6; }
.search-code { min-width: 0; padding-left: 10px; border-left: 1px solid #c5d4e7; color: #7188a0; overflow-wrap: anywhere; }
.search-identity p { margin: 6px 0 0; color: #607998; font-size: 12px; line-height: 1.7; overflow-wrap: anywhere; }
.search-table-wrap { margin-top: 16px; overflow: hidden; border: 1px solid #e9f0f8; border-radius: 6px; }
.search-metrics { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 14px; }
.search-metrics th, .search-metrics td { padding: 12px 10px; border-bottom: 1px solid #e9f0f8; text-align: right; vertical-align: middle; overflow-wrap: anywhere; font-weight: 500; }
.search-metrics th:first-child { width: 43%; text-align: left; }
.search-metrics thead th { color: #607998; background: #f0f7fd; font-size: 12px; font-weight: 700; }
.search-metrics tbody th { color: #142349; }
.search-metrics td { color: #2475e4; font-size: 16px; }
.search-metrics td:last-child { color: #099d87; }
.search-metrics .metric-muted, .search-metrics td.metric-muted:last-child { color: #7188a0; }
.search-metrics small { font-size: 11px; color: inherit; white-space: nowrap; }
.search-metrics tbody tr:last-child > * { border-bottom: 0; }
.search-more { display: block; min-height: 42px; margin: 16px auto 0; padding: 8px 20px; border: 1px solid #c5dbf9; border-radius: 6px; color: #2674e8; background: #fff; }
@media (max-width: 360px) { .capacity-search { padding: 18px 10px 24px; } .search-toolbar, .search-result { padding: 14px 12px; } .search-controls { gap: 8px; } .search-kinds button { width: 56px; } .search-controls select { width: 110px; padding: 0 6px; font-size: 13px; } .search-identity { gap: 9px; } .search-avatar { width: 42px; height: 42px; flex-basis: 42px; } .search-identity h3 { font-size: 16px; } .search-metrics th, .search-metrics td { padding: 11px 8px; } .search-metrics { font-size: 13px; } .search-metrics td { font-size: 15px; } }
</style>
