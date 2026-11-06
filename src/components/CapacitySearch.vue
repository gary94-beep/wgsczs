<template>
  <section class="capacity-search" aria-label="人员渠道产能查询">
    <header class="search-page-heading">
      <div class="search-heading-top"><h2>产能速查</h2><p>快速定位到人到渠道</p></div>
      <div class="search-heading-bottom"><span class="search-scope"><i class="search-ui-icon" :style="iconStyle('location')" aria-hidden="true"></i>{{ scope }}</span><span class="search-source"><svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0M4 18c0 4 16 4 16 0"/></svg>产能 · 系统取数</span></div>
    </header>
    <div class="search-toolbar">
      <div class="search-kinds" role="group" aria-label="搜索对象"><button v-for="item in kinds" :key="item.id" type="button" :aria-pressed="kind === item.id" :class="{ active: kind === item.id }" @click="kind = item.id; limit = 10">{{ item.label }}</button></div>
      <label class="search-product-row"><span>产品</span><span class="search-select-wrap"><select v-model="productId" aria-label="查询产品"><option value="">全部产品</option><option v-for="item in dashboard.products" :key="item.productId" :value="item.productId">{{ item.productName }}</option></select><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg></span></label>
      <div class="search-input"><i class="search-ui-icon" :style="iconStyle('search')" aria-hidden="true"></i><input v-model="query" type="search" maxlength="100" :placeholder="['people','own'].includes(kind) ? '搜索姓名 / 员工工号' : '搜索渠道名称 / 渠道编码'" :aria-label="['people','own'].includes(kind) ? '搜索姓名或工号' : '搜索渠道名称或编码'" @keydown.esc="query = ''" /><button v-if="query" type="button" title="清空搜索" aria-label="清空搜索" @click="query = ''"><i class="search-ui-icon" :style="iconStyle('clear')" aria-hidden="true"></i></button></div>
    </div>
    <p class="search-helper">{{ kind === 'own' ? '可按姓名或工号查询本人及所管对象产能' : kind === 'people' ? '可按姓名或工号查询行随销人员产能' : '可按渠道名称或编码查询产能' }}<span v-if="demo" class="search-demo">演示数据</span></p>
    <div v-if="!query.trim()" class="search-welcome">
      <svg class="search-welcome-art" viewBox="0 0 240 116" aria-hidden="true">
        <ellipse cx="122" cy="99" rx="103" ry="14" fill="#d2eaff"/>
        <g fill="#e7f4ff" stroke="#78b7fa" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="72" cy="34" r="15"/><path d="M43 88v-6a29 29 0 0 1 58 0v6Z"/><path d="M151 47h53v43h-53z"/><path d="m149 23-9 19q0 10 9 10 7 0 10-6 5 12 15 0 7 12 16 0 5 7 11 5 8-1 8-10l-10-18Z"/><path d="M174 90V71h14v19"/></g>
        <path d="m130 83 23 23" stroke="white" stroke-width="13" stroke-linecap="round"/><circle cx="111" cy="66" r="27" fill="white" stroke="white" stroke-width="12"/><circle cx="111" cy="66" r="27" fill="#fff" stroke="#0875fc" stroke-width="5"/><path d="m131 86 22 21" stroke="#0875fc" stroke-width="7" stroke-linecap="round"/>
      </svg>
      <h3>输入关键词，快速查询产能</h3><p>支持查看本人、所管人员及渠道明细</p>
    </div>
    <p v-if="error" class="search-error" role="alert">{{ error }}</p>
    <template v-if="query.trim()"><div class="search-result-heading" aria-live="polite"><span>{{ busy ? '查询中...' : `共 ${results.length} ${['people','own'].includes(kind) ? '位人员' : '个渠道'}` }}</span><time v-if="dailyDate(resultDates || dashboard) !== ((resultDates || dashboard).statDate || '')">日数据 {{ dailyLabel(resultDates || dashboard) }} · 月数据 {{ (resultDates || dashboard).statDate || '暂无' }}</time><time v-else>截至 {{ dailyLabel(resultDates || dashboard) }}</time></div><p v-if="!busy && !error && !results.length" class="search-empty">当前可查看范围内暂无匹配结果</p>
      <template v-for="item in results.slice(0, limit)" :key="item.key"><OwnCapacityResult v-if="item.isOwn" :item="item" /><article v-else class="search-result">
        <header class="search-identity"><span class="search-avatar" :class="`search-avatar-${kind}`" aria-hidden="true"><i class="search-ui-icon" :style="iconStyle(kind === 'people' ? 'person' : 'store')"></i></span><div class="search-identity-copy"><h3>{{ item.name }}</h3><div class="search-identity-meta"><span class="search-role">{{ item.role || '类型未提供' }}</span><span v-if="item.role !== '末梢渠道' &amp;&amp; !String(item.code || '').startsWith('tail:')" class="search-code">{{ item.code || '编码未提供' }}</span></div><p>{{ branchName(item.branchId) }} · {{ gridName(item.gridId) }}</p></div></header>
        <div class="search-managers"><span class="manager-caption">看管人</span><span v-for="manager in item.managers || []" :key="manager.code" class="manager-tag">{{ manager.name }}<span> · {{ manager.role }}</span></span><span v-if="!item.managers?.length" class="manager-empty">暂无看管信息</span></div>
        <div class="search-table-wrap"><table class="search-metrics" :class="{'has-month-targets':kind === 'people'}" :aria-label="`${item.name}产能`"><thead><tr class="search-metric-head"><th scope="col">产品</th><th scope="col">当日</th><th scope="col">本月</th><th v-if="kind === 'people'" scope="col">月度目标</th></tr></thead><tbody><template v-for="metric in item.values" :key="metric.productId"><tr><th scope="row">{{ metric.productName }}</th><td :class="{ 'metric-muted': metric.day == null || metric.day === 0 }">{{ format(metric.day) }}<small v-if="metric.day != null"> {{ metric.unit }}</small></td><td :class="{ 'metric-muted': metric.month == null || metric.month === 0 }">{{ format(metric.month) }}<small v-if="metric.month != null"> {{ metric.unit }}</small></td><td v-if="kind === 'people'" class="metric-month-target"><span v-if="['行销经理','商企经理'].includes(item.role) && (metric.monthBaseTarget != null || metric.monthChallengeTarget != null)" class="metric-target-pair"><span class="target-chip target-chip-base"><span>基础</span><strong>{{ metric.monthBaseTarget == null ? '—' : format(metric.monthBaseTarget) }}</strong></span><span class="target-chip target-chip-challenge"><span>挑战</span><strong>{{ metric.monthChallengeTarget == null ? '—' : format(metric.monthChallengeTarget) }}</strong></span></span><span v-else-if="item.role === '装维随销' && metric.monthChallengeTarget != null" class="metric-target-pair"><span class="target-chip target-chip-challenge"><span>挑战</span><strong>{{ format(metric.monthChallengeTarget) }}</strong></span></span><span v-else class="target-unset" aria-label="未配置目标">—</span></td></tr><tr class="search-comparison"><td :colspan="kind === 'people' ? 4 : 3"><span v-if="kind === 'people'">本月累计 {{ format(metric.month) }} · 上月同期累计 {{ format(metric.previous) }} {{ metric.unit }}</span><span v-else>本月日均 {{ format(metric.monthAverage) }} · 上月同期日均 {{ format(metric.previousAverage) }} {{ metric.unit }}/日</span><strong :class="{ 'comparison-down': comparisonValue(metric) < 0, 'comparison-up': comparisonValue(metric) > 0 }">{{ comparison(metric) }}</strong></td></tr></template></tbody></table></div>
      </article></template>
      <button v-if="results.length > limit" class="search-more" type="button" @click="limit += 10">查看更多</button>
    </template>
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import OwnCapacityResult from './OwnCapacityResult.vue'
import { dailyDate,dailyLabel } from '../utils/dailyReporting.js'
import { searchCapacity } from '../utils/capacitySearch.js'
import { matchesSearchCategory } from '../utils/searchCategories.js'
import { compareSearchTotals } from '../utils/searchTotalsComparison.js'
import searchIcon from '../assets/ui-icons/search.svg'
import clearIcon from '../assets/ui-icons/x.svg'
import locationIcon from '../assets/ui-icons/map-pin.svg'
import storeIcon from '../assets/ui-icons/store.svg'
import personIcon from '../assets/ui-icons/user-round.svg'
const props = defineProps({ dashboard: Object, gridIds: Array, scope: String, demo: Boolean, queryApi: Function, channelType: { type: String, default: '' } })
const query = ref(''), kind = ref('own'), productId = ref(''), limit = ref(10)
const kinds = [{ id: 'own', label: '网格经理' }, { id: 'people', label: '行随销' }, { id: 'channels', label: '渠道' }, { id: 'halls', label: '营业厅' }]
const resultDates=ref(null)
const remoteResults = ref([]), error = ref(''), busy = ref(false)
const requestKind = () => kind.value === 'halls' ? 'channels' : kind.value
const requestType = () => kind.value === 'halls' ? '营业厅' : props.channelType
const results = computed(() => (props.queryApi ? remoteResults.value : searchCapacity(props.dashboard, { query: query.value, kind: requestKind(), productId: productId.value, gridIds: props.gridIds, channelType: requestType() })).filter(item => matchesSearchCategory(item, kind.value)))
let sequence = 0
watch([query, kind, productId, () => JSON.stringify(props.gridIds), () => props.channelType], (values, previous, cleanup) => {
  const id = ++sequence
  remoteResults.value = []; resultDates.value=null; error.value = ''; busy.value = false
  if (!props.queryApi || !query.value.trim()) return
  const params = { query: query.value, kind: requestKind(), productId: productId.value, gridIds: props.gridIds, channelType: requestType() }
  busy.value = true
  const timer = setTimeout(async () => {
    try { const data = await props.queryApi(params); if (id === sequence) {remoteResults.value = data.results || [];resultDates.value={statDate:data.statDate ?? props.dashboard.statDate,dailyStatDate:data.dailyStatDate ?? props.dashboard.dailyStatDate,dailyStatHour:data.dailyStatHour ?? props.dashboard.dailyStatHour}} }
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
const comparisonValue = metric => kind.value === 'people' ? compareSearchTotals(metric).difference : metric.changeValue
function comparison(metric) {
  const total = kind.value === 'people', value = total ? compareSearchTotals(metric) : {difference:metric.changeValue,rate:metric.changeRate}
  const label = total ? '较上月同期' : '较上月同期日均'
  if (value.difference == null) return label+'：暂无可比数据'
  const signed = value => `${value > 0 ? '+' : ''}${format(value)}`
  return `${label} ${signed(value.difference)} ${metric.unit}${total ? '' : '/日'}${value.rate == null ? '（上期为0，变化率不适用）' : `（${signed(value.rate)}%）`}`
}
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
.search-kinds button { width: auto; min-width: 45px; padding: 0 9px; font-size: 14px; }
.search-metrics .search-comparison td { text-align: left; background: #f8fbff; }
.search-comparison span { display: block; color: #71849d; font-size: 11px; line-height: 1.7; white-space: normal; }
.search-comparison strong { display: block; margin-top: 3px; color: #607998; font-size: 12px; line-height: 1.7; white-space: normal; }
.search-comparison .comparison-down { color: #c47721; }
.search-comparison .comparison-up { color: #099d87; }
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
@media (max-width: 360px) { .search-kinds button { width: auto; min-width: 40px; padding: 0 7px; font-size: 13px; } .search-controls select { width: 100px; } }
/* Use the same white introductory card as the production overview. */
.capacity-search{padding:20px 0 30px;font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif}
.search-page-heading{align-items:center;gap:16px;margin:0 0 18px;padding:20px;border:1px solid #c5dcff;border-radius:14px;background:linear-gradient(125deg,#fff 30%,#f3f9ff);box-shadow:0 4px 10px #3379c110}
.search-heading-copy{min-width:0;flex:1}
.search-page-heading h2{font-size:32px;line-height:1.2;font-weight:900;color:#101f46;letter-spacing:-.5px;-webkit-text-stroke:.2px currentColor}
.search-page-heading p{font-size:15px;font-weight:600;color:#607998;line-height:1.5;margin-top:9px}
.search-page-meta{justify-content:flex-end;gap:8px;font-size:14px;max-width:48%}
.search-page-meta .search-scope{gap:6px;color:#456b9a;font-weight:700;padding:6px 10px;border:1px solid #dae9fc;border-radius:7px;background:#f1f7ff}
.search-page-meta .search-ui-icon{width:18px;height:18px;flex-basis:18px;color:#1672fa}
.search-heading-source{flex-basis:100%;display:flex}
.search-heading-source>span{display:inline-flex;align-items:center;gap:9px;padding:7px 12px;border-radius:8px;background:linear-gradient(100deg,#e5efff,#e0edff);color:#4e6d96;font-size:14px;font-weight:700}
.search-heading-source svg{width:21px;height:21px;fill:none;stroke:#559aff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.search-toolbar{border-radius:12px}
@media(max-width:430px){.search-page-heading{padding:16px 14px;gap:13px}.search-page-heading h2{font-size:28px}.search-page-heading p{font-size:13px}.search-page-meta{font-size:12px}.search-page-meta .search-scope{padding:5px 7px}.search-heading-source>span{font-size:13px;padding:6px 10px}}
@media(max-width:360px){.capacity-search{padding:18px 0 24px}.search-page-heading{padding:14px 12px;gap:11px}.search-page-heading h2{font-size:25px}.search-page-heading p{font-size:12px}.search-page-meta{font-size:11px}}

.search-metrics.has-month-targets th:first-child{width:31%}
.search-metrics.has-month-targets th,.search-metrics.has-month-targets td{padding-left:7px;padding-right:7px}
.search-metrics.has-month-targets td:not([colspan]){white-space:nowrap}
.search-metrics.has-month-targets .metric-month-target{color:#354f72;font-size:15px;font-weight:600}
.search-metrics.has-month-targets .metric-month-target.metric-muted{color:#7188a0;font-weight:500}
@media(max-width:360px){.search-metrics.has-month-targets th,.search-metrics.has-month-targets td{padding-left:5px;padding-right:5px}.search-metrics.has-month-targets td:not([colspan]){font-size:13px}.search-metrics.has-month-targets thead th{font-size:11px}}

.search-metrics.has-month-targets th:first-child{width:28%}
.search-metrics.has-month-targets th:nth-child(2),.search-metrics.has-month-targets th:nth-child(3){width:18%}
.search-metrics.has-month-targets td.metric-month-target{white-space:normal;font-size:13px}
.metric-target-pair{display:inline-flex;flex-wrap:wrap;justify-content:flex-end;gap:2px 0;font-size:12px;line-height:1.65}
.metric-target-pair>span{white-space:nowrap}

/* Compact goal labels keep the numbers aligned without punctuation or repeated units. */
.metric-target-pair{display:inline-grid;grid-template-columns:minmax(0,1fr);gap:5px;width:min(100%,92px);vertical-align:middle;line-height:1.3;text-align:left}
.metric-target-pair>.target-chip{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:5px 7px;border-radius:6px;white-space:nowrap;background:#f0f5fc;color:#667e9c}
.target-chip>span{font-size:11px;font-weight:500}
.target-chip>strong{font-size:14px;line-height:1.2;font-weight:700;font-variant-numeric:tabular-nums;color:#284e7b}
.metric-target-pair>.target-chip-challenge{background:#e9f8f4;color:#369787}
.target-chip-challenge>strong{color:#079b85}
.target-unset{display:inline-block;padding-right:5px;color:#9bacc0;font-size:18px;font-weight:400}
@media(max-width:360px){.metric-target-pair{gap:4px}.metric-target-pair>.target-chip{padding:4px 5px;gap:4px}.target-chip>span{font-size:10px}.target-chip>strong{font-size:12px}}
.search-controls{flex-wrap:wrap}.search-kinds{flex-wrap:wrap}.search-kinds button{min-width:40px}.search-controls select{margin-left:auto}

/* Broadband-style search introduction; the parent breadcrumb and return button stay intact. */
.capacity-search{padding:18px 0 26px;color:#122b4b;background:radial-gradient(ellipse at 55% 65%,#e5f5ff80,transparent 75%);font-family:"Microsoft YaHei","PingFang SC",sans-serif}
.search-page-heading{display:block;margin:0 0 16px;padding:12px 0 14px;overflow:hidden;border:1px solid #c7e2fb;border-radius:13px;background:linear-gradient(115deg,#fff,#f7fcff);box-shadow:0 2px 5px #1d70bc0b}
.search-heading-top{display:flex;align-items:center;gap:12px;width:100%}
.search-heading-top h2{flex:0 0 38%;box-sizing:border-box;margin:0;padding:9px 17px 10px 12px;clip-path:polygon(0 0,100% 0,89% 100%,0 100%);background:linear-gradient(110deg,#0876fc 25%,#00b6df);color:#fff;font-size:clamp(20px,5.2vw,30px);font-weight:800;letter-spacing:0;line-height:1.3;text-align:center;-webkit-text-stroke:0}
.search-heading-top p{flex:1;min-width:0;margin:0 12px 0 0;padding-left:10px;border-left:3px solid #1672fa;color:#142b4d;font-size:clamp(12px,3.1vw,18px);line-height:1.4;font-weight:700;white-space:nowrap}
.search-heading-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:15px 13px 0}
.search-scope{display:inline-flex;align-items:center;gap:6px;font-size:17px;color:#123052;font-weight:700;min-width:0;overflow-wrap:anywhere}
.search-scope .search-ui-icon{width:22px;height:22px;flex-basis:22px;color:#0876fc}
.search-source{display:inline-flex;align-items:center;gap:7px;flex-shrink:0;padding:5px 10px;border-radius:20px;background:linear-gradient(95deg,#e4f3ff,#d6edff);color:#234c7d;font-size:13px;line-height:1.5;font-weight:700;white-space:nowrap}
.search-source svg{width:20px;height:20px;stroke:#0875fc;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.search-toolbar{padding:15px 13px 16px;border:1px solid #cde4fa;border-radius:13px;background:#fff;box-shadow:0 2px 5px #1d70bc08}
.search-kinds{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));width:100%;overflow:hidden;flex:none;border-radius:9px;background:linear-gradient(100deg,#eaf5fc,#dfedf8)}
.search-kinds button{box-sizing:border-box;width:100%;min-width:0;height:43px;padding:0 3px;border:0;border-right:1px solid #c9def1;border-radius:0;background:transparent;color:#63758a;font-size:16px;line-height:1.2;font-weight:700;white-space:nowrap}
.search-kinds button:last-child{border-right:0}.search-kinds button.active{border-radius:8px 0 0 8px;background:linear-gradient(110deg,#087cff,#0066f4);color:#fff}.search-kinds button.active:last-child{border-radius:0 8px 8px 0}.search-kinds button.active:not(:first-child):not(:last-child){border-radius:5px}
.search-product-row{display:flex;align-items:center;gap:15px;margin-top:17px;color:#18304d;font-size:17px;font-weight:700}
.search-select-wrap{display:block;position:relative;flex:1;min-width:0}
.search-product-row select{appearance:none;-webkit-appearance:none;box-sizing:border-box;width:100%;height:39px;padding:0 34px 0 12px;border:1px solid #b4cbe8;border-radius:5px;background:linear-gradient(110deg,#fff,#f4f9ff);color:#172a43;font-size:16px;line-height:normal;font-weight:400;box-shadow:0 1px 2px #2b619c12}
.search-select-wrap svg{position:absolute;top:50%;right:11px;width:18px;height:18px;transform:translateY(-50%);pointer-events:none;fill:none;stroke:#6b8199;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.search-input{gap:10px;margin-top:13px;padding-left:13px;border:1px solid #71aaff;border-radius:9px;background:linear-gradient(110deg,#fff,#f3f9ff)}
.search-input>.search-ui-icon{color:#0875fc;width:22px;height:22px;flex-basis:22px}.search-input input{height:48px;color:#17375a;font-size:16px}.search-input input::placeholder{color:#82909e;opacity:1}
.search-helper{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:10px 5px 0;color:#8193a5;font-size:12px;line-height:1.65}.search-demo{font-size:10px;padding:1px 5px}
.search-welcome{padding:27px 5px 18px;text-align:center}.search-welcome-art{display:block;width:194px;height:auto;margin:0 auto 13px}.search-welcome h3{margin:0;color:#102948;font-size:21px;font-weight:800;line-height:1.5}.search-welcome p{margin:7px 0 0;color:#7c8e9c;font-size:14px;line-height:1.6}
@media(max-width:360px){.search-heading-top{gap:8px}.search-heading-top h2{padding-left:7px;padding-right:14px}.search-heading-top p{padding-left:7px;margin-right:7px;font-size:11px}.search-heading-bottom{margin-left:10px;margin-right:10px;gap:5px}.search-scope{font-size:15px}.search-source{padding:4px 7px;font-size:11px;gap:5px}.search-toolbar{padding:13px 10px}.search-kinds button{font-size:14px;height:40px}.search-product-row{font-size:16px;gap:12px}.search-welcome h3{font-size:19px}.search-welcome p{font-size:12px}.search-helper{font-size:11px}}

.search-managers{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:12px 0 0;font-size:12px;line-height:1.6}.manager-caption{color:#7b8ba1;margin-right:2px}.manager-tag{display:inline-block;padding:3px 8px;border:1px solid #e5d9f6;border-radius:5px;background:#f6f0ff;color:#7247a4;font-weight:600;overflow-wrap:anywhere}.manager-tag>span{font-weight:400}.manager-empty{color:#94a2b5}
</style>

