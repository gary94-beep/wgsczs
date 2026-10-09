<template>
  <section class="capacity-search" aria-label="人员渠道产能查询">
    <header><h2>产能查询</h2><span>{{ scope }}<template v-if="demo"> · 演示数据</template></span></header>
    <div class="search-controls"><div class="search-kinds" role="group" aria-label="搜索对象"><button v-for="item in kinds" :key="item.id" type="button" :aria-pressed="kind === item.id" :class="{ active: kind === item.id }" @click="kind = item.id; limit = 10">{{ item.label }}</button></div><select v-model="productId" aria-label="查询产品"><option value="">全部产品</option><option v-for="item in dashboard.products" :key="item.productId" :value="item.productId">{{ item.productName }}</option></select></div>
    <div class="search-input"><input v-model="query" type="search" maxlength="100" :placeholder="kind === 'people' ? '搜索姓名 / 员工工号' : '搜索渠道名称 / 渠道编码'" :aria-label="kind === 'people' ? '搜索姓名或工号' : '搜索渠道名称或编码'" /><button v-if="query" type="button" title="清空搜索" aria-label="清空搜索" @click="query = ''">&#215;</button></div>
    <template v-if="query.trim()"><div class="search-result-heading" aria-live="polite"><span>{{ results.length }} {{ kind === 'people' ? '名人员' : '个渠道' }}</span><time>截至 {{ dashboard.statDate }}</time></div><p v-if="!results.length" class="search-empty">当前可查看范围内暂无匹配结果</p>
      <article v-for="item in results.slice(0, limit)" :key="item.key" class="search-result"><h3>{{ item.name }}</h3><p>{{ item.role || '类型未提供' }} · {{ item.code || '编码未提供' }}</p><p>{{ branchName(item.branchId) }} · {{ gridName(item.gridId) }}</p><div class="search-metrics"><div class="search-metric-head"><span>产品</span><span>当日</span><span>本月</span></div><div v-for="metric in item.values" :key="metric.productId"><strong>{{ metric.productName }}</strong><span>{{ format(metric.day) }}<small v-if="metric.day !== null"> {{ metric.unit }}</small></span><span>{{ format(metric.month) }}<small v-if="metric.month !== null"> {{ metric.unit }}</small></span></div></div></article>
      <button v-if="results.length > limit" class="search-more" type="button" @click="limit += 10">查看更多</button>
    </template>
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { searchCapacity } from '../utils/capacitySearch.js'
const props = defineProps({ dashboard: Object, gridIds: Array, scope: String, demo: Boolean, channelType: { type: String, default: '' } })
const query = ref(''), kind = ref('people'), productId = ref(''), limit = ref(10)
const kinds = [{ id: 'people', label: '人员' }, { id: 'channels', label: '渠道' }]
const results = computed(() => searchCapacity(props.dashboard, { query: query.value, kind: kind.value, productId: productId.value, gridIds: props.gridIds, channelType: props.channelType }))
watch([query, productId, () => props.channelType], () => { limit.value = 10 })
watch(() => JSON.stringify(props.gridIds), () => { query.value = ''; limit.value = 10 })
const branchName = id => props.dashboard.organization.branches.find(item => item.branchId === id)?.branchName || '分公司未提供'
const gridName = id => props.dashboard.organization.grids.find(item => item.gridId === id)?.gridName || '网格未提供'
const format = value => value === null ? '—' : value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
</script>
<style scoped>
.capacity-search { padding: 18px 20px; color: #163457; background: #f5fcff; border-bottom: 1px solid #dfedf8; } header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; } h2 { margin: 0; font-size: 18px; } header span, time { font-size: 11px; color: #738aa2; }
.search-controls { display: flex; gap: 12px; justify-content: space-between; margin: 14px 0 10px; } .search-kinds { display: flex; padding: 3px; border-radius: 6px; background: #e7f0f9; } button, input, select { font: inherit; } button { cursor: pointer; } .search-kinds button { min-width: 58px; height: 32px; padding: 0 10px; background: transparent; border: 0; border-radius: 4px; color: #64809b; font-size: 13px; } .search-kinds .active { background: white; color: #2674e8; box-shadow: 0 1px 4px #16446c15; } select { min-width: 0; max-width: 48%; padding: 0 10px; border-radius: 6px; border: 1px solid #ccdef5; background: white; color: #244565; font-size: 13px; }
.search-input { display: flex; border: 1px solid #bdd5f3; border-radius: 7px; background: white; overflow: hidden; } .search-input:focus-within { outline: 2px solid #8dbdff; } input { box-sizing: border-box; width: 100%; min-width: 0; height: 44px; padding: 0 12px; border: 0; outline: none; font-size: 14px; color: #173855; background: transparent; } input::-webkit-search-cancel-button { display: none; } .search-input button { width: 40px; flex-shrink: 0; border: 0; color: #6b819a; background: transparent; font-size: 24px; }
.search-result-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; margin-top: 14px; font-size: 12px; color: #5680a2; } .search-empty { padding: 16px 0; color: #7a8fa5; font-size: 13px; text-align: center; } .search-result { margin-top: 12px; border: 1px solid #d1e2f6; background: white; padding: 14px; border-radius: 8px; overflow-wrap: anywhere; } h3 { margin: 0; font-size: 16px; } .search-result p { margin: 5px 0 0; font-size: 11px; color: #64839e; line-height: 1.6; }
.search-metrics { margin-top: 10px; } .search-metrics > div { display: grid; grid-template-columns: minmax(0, 1.15fr) repeat(2, minmax(0, 1fr)); gap: 8px; padding: 9px 0; border-top: 1px solid #eef3fa; align-items: center; font-size: 13px; } .search-metrics span { text-align: right; color: #2475e4; } .search-metrics span:last-child { color: #099d87; } .search-metrics strong { font-size: 12px; font-weight: 500; } small { font-size: 10px; color: #7b90a6; } .search-metrics .search-metric-head { font-size: 11px; } .search-metric-head span { color: #7b90a6 !important; } .search-metric-head span:first-child { text-align: left; }
.search-more { display: block; margin: 14px auto 0; padding: 8px 18px; border: 1px solid #c5dbf9; border-radius: 6px; color: #2674e8; background: white; }
</style>
