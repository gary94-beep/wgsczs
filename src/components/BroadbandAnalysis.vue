<template>
  <section class="bb-page" :class="{'bb-inner-page':view !== 'overview','bb-overview':view === 'overview'}" aria-label="宽带一号工程专项" :aria-busy="busy">
    <header v-if="view !== 'overview'" class="bb-hero"><button type="button" class="bb-back" aria-label="返回上一级" @click="back">‹</button><div><h2>{{ activeCategory?.name }}</h2></div><span v-if="data?.demo" class="bb-demo">演示数据</span></header>
    <div v-if="view === 'overview'" class="bb-info-row"><span class="bb-info-scope"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0z"/><circle cx="12" cy="10" r="2"/></svg>{{ scopeLabel }}</span><span class="bb-info-date"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h3"/></svg>截至 {{ data?.statDate || statDate || '—' }}</span><em v-if="data?.demo">示意数据</em></div>
    <div v-else class="bb-scope"><strong>{{ scopeLabel }}</strong><span>截至 {{ data?.statDate || statDate || '—' }}</span></div>
    <div v-if="view === 'overview'" class="bb-dispatch-note"><strong class="bb-dispatch-title">调度看板</strong><span>优先关注零产与低产对象</span></div>
    <div class="bb-filters">
      <label v-if="permission.role === 'city'"><span>分公司<span class="bb-filter-colon">：</span></span><select v-model="filters.branch" aria-label="宽带一号工程专项分公司" :disabled="busy" @change="changeBranch"><option value="">全市</option><option v-for="b in branchOptions" :key="b.branchId" :value="b.branchName || b.branchId">{{ b.branchName || b.branchId }}</option></select></label>
      <label v-if="permission.role !== 'grid'"><span>{{ view === 'overview' ? '镇区' : '网格' }}<span class="bb-filter-colon">：</span></span><select v-model="filters.grid" aria-label="宽带一号工程专项网格" :disabled="busy || !filters.branch" @change="changeFilters"><option value="">{{ view === 'overview' ? '全部镇区' : '全部网格' }}</option><option v-for="g in gridOptions" :key="g.gridId" :value="g.gridName">{{ g.gridName }}</option></select></label>
      <button type="button" class="bb-refresh" aria-label="刷新宽带一号工程专项" :disabled="busy" @click="load(false)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7V3m0 4h-4M4 17v4m0-4h4M20 7a9 9 0 0 0-15-2M4 17a9 9 0 0 0 15 2"/></svg></button>
    </div>
    <div v-if="clock" class="bb-time"><strong>本月时序 <b>{{ percent(clock.timeProgress) }}</b></strong><span>已过 {{ clock.elapsedDays }}/{{ clock.daysInMonth }} 天</span><div v-if="view === 'overview'" class="bb-clock-progress"><i :style="{width:fill(clock.timeProgress)}"></i></div></div>
    <div v-if="error" class="bb-error" role="alert"><span>{{ error }}</span><button type="button" @click="load(false)">重试</button></div>
    <p v-if="busy && !data" class="bb-loading" role="status">正在查询宽带一号工程专项…</p>
    <p v-for="warning in data?.warnings || []" :key="warning" class="bb-warning">{{ warning }}</p>

    <template v-if="view === 'overview'">
      <div class="bb-category-grid">
        <button v-for="c in data?.categories || []" :key="c.id" type="button" class="bb-category" :class="tone(c.stats)" :disabled="busy" @click="openCategory(c.id)">
          <span class="bb-category-icon" aria-hidden="true"><svg viewBox="0 0 32 32">
            <g v-if="c.id === 'contractors'"><circle cx="16" cy="10" r="4"/><path d="M8 28v-4a8 8 0 0 1 16 0v4zM6 14a3 3 0 1 1 2-5m18 5a3 3 0 1 0-2-5M6 18c-3 1-4 4-4 7v3h4m20-10c3 1 4 4 4 7v3h-4"/></g>
            <g v-else-if="c.id === 'managers'"><rect x="3" y="10" width="26" height="19" rx="3"/><path d="M11 10V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4M3 18c8 3 18 3 26 0M16 18v4"/></g>
            <g v-else-if="c.id === 'installers'"><path d="M7 12a9 9 0 0 1 18 0M4 14h24M16 3v9"/><circle cx="16" cy="20" r="5"/><path d="M6 30c0-5 4-7 10-7s10 2 10 7"/></g>
            <g v-else-if="c.id === 'residents'"><rect x="7" y="2" width="18" height="28" rx="3"/><path d="M13 26h6"/></g>
            <g v-else><path d="M5 3h22l3 9c0 5-6 6-8 2-2 4-10 4-12 0-2 4-8 3-8-2zM5 17v12h22V17"/><path v-if="c.id === 'stars'" d="m16 18 2 3 4 .5-3 2.5 1 4-4-2-4 2 1-4-3-2.5 4-.5z"/><path v-else d="M12 29V19h8v10"/></g>
          </svg></span>
          <header><h3>{{ c.name }}</h3><span class="bb-cadence-tag">{{ cadences[c.id] }}</span></header>
          <strong class="bb-main-rate" :aria-label="`月目标完成率${percent(c.stats.completionRate)}`">{{ percent(c.stats.completionRate) }}</strong>
          <div class="bb-progress" :title="`本月时序${percent(clock?.timeProgress)}`"><i :style="{width: fill(c.stats.completionRate)}"></i><b :style="{left: fill(clock?.timeProgress)}" title="当前时序"></b></div>
          <footer class="bb-row-stats"><span>规模 <b>{{ c.stats.totalCount }}</b>{{ c.unit }}</span><span>时序达标 <b>{{ c.stats.reachedCount }}/{{ c.stats.evaluatedCount }}</b></span><span class="bb-stat-zero">零产 <b>{{ c.stats.zeroCount }}</b></span><span class="bb-stat-low">低产 <b>{{ c.stats.lowCount ?? '—' }}</b></span></footer>
          <small v-if="c.stats.missingDataCount || c.stats.missingTargetCount" class="bb-incomplete">异常产能 {{ c.stats.missingDataCount }} · 缺目标 {{ c.stats.missingTargetCount }}</small>
        </button>
      </div>
      <div v-if="data" class="bb-legend"><span class="bb-green-dot"></span>完成率 ≥ 时序率<span class="bb-orange-dot"></span>落后时序<span class="bb-red-dot"></span>零产</div>
      <p v-if="data" class="bb-footnote">完成率＝有效对象累计产能÷同批对象月目标。有效对象须有正数目标且产能无异常；当前月份无产能记录按零产计，缺目标不视作落后。</p>
    </template>

    <template v-else-if="data">
      <section class="bb-summary" aria-label="专项核心指标">
        <div class="bb-metric bb-metric-people"><span>{{ activeCategory?.unit === '人' ? '人数' : activeCategory?.unit === '商' ? '商家数' : '渠道数' }}</span><strong>{{ stats.totalCount }}<small>{{ activeCategory?.unit }}</small></strong><svg class="bb-metric-icon" viewBox="0 0 40 40" aria-hidden="true"><circle cx="15" cy="12" r="6"/><path d="M4 33v-4c0-6 5-10 11-10s11 4 11 10v4z"/><circle cx="30" cy="14" r="4"/><path d="M28 23c6-1 9 3 9 8v2h-8v-4z"/></svg></div>
        <div class="bb-metric bb-metric-output"><span>累计完成</span><strong>{{ format(stats.production) }}<small>条</small></strong><svg class="bb-metric-icon" viewBox="0 0 40 40" aria-hidden="true"><rect x="8" y="3" width="25" height="34" rx="4"/><path d="M14 12h13M14 20h13M14 28h8" stroke="white" stroke-width="3" stroke-linecap="round"/></svg></div>
        <div class="bb-metric bb-metric-rate" :class="tone(stats)"><span>月目标完成率</span><strong>{{ percent(stats.completionRate) }}</strong><svg class="bb-metric-icon" viewBox="0 0 40 40" aria-hidden="true"><path d="m4 30 10-12 8 7L35 9M27 9h8v8" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="bb-metric bb-metric-gap bb-tone-behind"><span>月目标缺口</span><strong>{{ format(stats.gap) }}<small>条</small></strong><svg class="bb-metric-icon" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17"/><path d="M20 10v12" stroke="white" stroke-width="3.5" stroke-linecap="round"/><circle cx="20" cy="29" r="2" fill="white"/></svg></div>
      </section>
      <div class="bb-target-summary"><span>月目标 <b>{{ format(stats.monthlyTarget) }}</b> 条</span><span>时序应达 <b>{{ whole(stats.expected) }}</b> 条</span><span>时序达标 <b>{{ stats.reachedCount }}/{{ stats.evaluatedCount }}</b> {{ activeCategory?.unit }}（{{ percent(stats.reachedRate) }}）</span></div>
      <section v-if="data.rankingAnalysis && !filters.grid && permission.role !== 'grid'" class="bb-ranking-analysis" aria-label="区域完成率分析">
        <header><h3>区域完成率分析</h3><span>按月目标完成率</span></header>
        <div v-if="branchAnalysis" class="bb-ranking-row">
          <strong>网格</strong>
          <div v-if="branchRanking.best" class="bb-ranking-copy">
            <p><span class="bb-ranking-good">相对领先</span>{{ rankLabel(branchRanking.best) }}</p>
            <p><span class="bb-ranking-bad">重点关注</span>{{ rankLabel(branchRanking.worst) }}</p>
          </div>
          <p v-else>当前分公司暂无可评估网格</p>
        </div>
        <template v-else>
        <div class="bb-ranking-row">
          <strong>分公司</strong>
          <div v-if="data.rankingAnalysis.branches.count > 1" class="bb-ranking-copy">
            <p><span class="bb-ranking-good">相对领先</span>{{ rankLabel(data.rankingAnalysis.branches.best) }}</p>
            <p><span class="bb-ranking-bad">重点关注</span>{{ rankLabel(data.rankingAnalysis.branches.worst[0]) }}</p>
          </div>
          <p v-else-if="data.rankingAnalysis.branches.best">当前范围仅1个可评估分公司：{{ rankLabel(data.rankingAnalysis.branches.best) }}</p>
          <p v-else>暂无可评估分公司</p>
        </div>
        <div v-for="group in data.rankingAnalysis.grids" :key="group.type" class="bb-ranking-row">
          <strong>{{ group.type }}类网格</strong>
          <div v-if="group.count" class="bb-ranking-copy">
            <p><span class="bb-ranking-good">相对领先</span>{{ rankLabel(group.best) }}</p>
            <p><span class="bb-ranking-bad">重点关注{{ group.worst.length }}个</span>{{ group.worst.map(rankLabel).join('；') }}</p>
            <small v-if="group.count < group.worstLimit">当前范围可评估{{ group.count }}个，按实际数量展示。</small>
          </div>
          <p v-else>当前范围暂无可评估的{{ group.type }}类网格</p>
        </div>
        </template>
        <footer>仅比较当前类型和筛选范围；完成率＝有效对象累计完成÷同批月目标。缺目标不排名；同率按名称排序。<template v-if="!branchAnalysis && data.rankingAnalysis.unclassifiedCount">另有{{ data.rankingAnalysis.unclassifiedCount }}个网格尚未配置ABC类别。</template></footer>
      </section>
      <div v-if="stats.missingDataCount || stats.missingTargetCount" class="bb-quality"><span>异常产能 {{ stats.missingDataCount }} · 缺目标/零目标 {{ stats.missingTargetCount }}</span><small>完成量、目标、完成率及同期对比均按同批有效对象计算；当前月份无记录按零产计入；异常产能或缺目标的对象不参与计算。全部已记录产能 {{ format(stats.knownProduction) }} 条。<span v-if="stats.invalidDataCount">其中 {{ stats.invalidDataCount }} 个对象的产能记录异常。</span></small><button v-if="view === 'details'" type="button" @click="setStatus(stats.missingDataCount ? 'missingData' : 'missingTarget')">查看待核实对象 ›</button></div>
      <details class="bb-trends"><summary>展开周、月同期对比</summary><div><span>近7天日均</span><b>{{ format(stats.weeklyAverage) }} 条/日</b></div><div><span>较前7天日均</span><b>{{ stats.weekChangeRate == null ? '暂无可比数据' : signedPercent(stats.weekChangeRate) }}</b></div><div><span>本月 / 上月同期日均</span><b>{{ format(stats.monthAverage) }} / {{ format(stats.previousAverage) }} 条/日</b></div><div><span>较上月同期日均</span><b>{{ stats.monthChangeRate == null ? '暂无可比数据' : signedPercent(stats.monthChangeRate) }}</b></div></details>

      <div class="bb-focus-banner"><strong>重点关注</strong><button type="button" @click="showFocus('zero')">零产 <b>{{ stats.zeroCount }}</b> {{ activeCategory?.unit }}</button><button type="button" @click="showFocus('low')">低产 <b>{{ stats.lowCount ?? '—' }}</b> {{ activeCategory?.unit }}</button><small>零产＝0条；低产＝1–3条（不含零产）</small></div>
      <section v-if="data.distribution" class="bb-distribution"><header class="bb-section-head"><h3>{{ activeCategory?.unit === '人' ? '人员' : '渠道' }}产能分层占比</h3><span>按本月累计条数</span></header><div class="bb-bars bb-percent-bars"><button v-for="bin in data.distribution" :key="bin.id" type="button" :class="[`bb-bin-${bin.id}`,{'active':tier===bin.id && view==='details'}]" :aria-label="`查看${bin.id}层明细`" @click="selectTier(bin.id)"><strong>{{ percent(bin.rate) }}</strong><div class="bb-bar-track"><i :style="{height:fill(bin.rate)}"></i></div><b>{{ bin.id }}层</b><small>{{ bin.label }}</small><span>{{ bin.count }} {{ activeCategory?.unit }}</span></button></div></section>
      <section v-if="view === 'regions'" class="bb-regions">
        <header class="bb-section-head"><h3>{{ data.level === 'branch' ? '分公司' : '镇区/网格' }}对比</h3><span>按月目标缺口从大到小</span></header>
        <article v-for="(region,index) in data.regions" :key="region.id" class="bb-region-card"><button type="button" class="bb-region-row" :disabled="busy" @click="openRegion(region)"><span class="bb-rank">{{ index+1 }}</span><strong>{{ region.name || '组织未提供' }}</strong><div><span>{{ format(region.stats.production) }} / {{ format(region.stats.monthlyTarget) }} 条</span><div class="bb-progress" :class="tone(region.stats)"><i :style="{width: fill(region.stats.completionRate)}"></i><b :style="{left: fill(clock.timeProgress)}"></b></div></div><b :class="tone(region.stats)">{{ percent(region.stats.completionRate) }}<small>月完成率 ›</small></b><small class="bb-region-meta"><span>月目标缺口 {{ format(region.stats.gap) }}</span><span>时序达标 {{ region.stats.reachedCount }}/{{ region.stats.evaluatedCount }}</span></small></button><div class="bb-region-levels" v-if="region.distribution"><div v-for="bin in region.distribution" :key="bin.id" :class="`bb-bin-${bin.id}`"><strong>{{ percent(bin.rate) }}</strong><div class="bb-mini-track"><i :style="{height:fill(bin.rate)}"></i></div><b>{{ bin.id }}层</b><small>{{ bin.count }}{{ activeCategory?.unit }}</small></div></div></article>
        <p v-if="!data.regions?.length" class="bb-empty">当前范围暂无该类对象，请核对维表中的岗位和组织信息。</p>
        <button type="button" class="bb-primary bb-detail-entry" :disabled="busy" @click="openDetails">查看零产/低产重点对象 ›</button>
      </section>

      <div v-if="view === 'details'" class="bb-detail-results" ref="detailResults">
        <div class="bb-status-tabs" role="group" aria-label="宽带一号工程专项明细筛选"><button v-for="s in statuses" :key="s.id" type="button" :class="{active: status===s.id}" :aria-pressed="status===s.id" @click="setStatus(s.id)">{{ s.name }}</button></div>
        <p v-if="status === 'missingData' || status === 'missingTarget'" class="bb-warning">当前筛选：{{ status === 'missingData' ? '异常产能' : '缺目标 / 零目标' }}。可点击“全部”返回。</p>
        <div class="bb-search"><span aria-hidden="true">⌕</span><input v-model="query" type="search" maxlength="100" placeholder="搜索姓名、工号、商家或渠道编码" aria-label="宽带一号工程专项搜索" /><button v-if="query" type="button" aria-label="清空宽带搜索" @click="query=''">×</button></div>
        <p v-if="tier" class="bb-tier-selection">已选 {{ tier }} 层<button type="button" @click="selectTier('')">清除层级筛选 ×</button></p><p class="bb-result-count">共 {{ data.pagination?.total || 0 }} {{ activeCategory?.unit }}<span>按月目标缺口从大到小</span></p>
        <article v-for="row in detailRows" :key="`${row.branch}|${row.grid}|${row.identity}`" class="bb-person" :class="{'bb-person-zero':row.zero,'bb-person-low':row.low,'bb-business-card':categoryId === 'contractors' || categoryId === 'stars'}">
          <header><div class="bb-person-title"><span class="bb-person-avatar" aria-hidden="true"><i class="bb-detail-icon" :style="detailIconStyle(activeCategory?.unit === '人' ? 'person' : 'store')"></i></span><h3>{{ row.name }} <small v-if="row.tier" class="bb-tier-tag" :class="`bb-bin-${row.tier}`">{{ row.tier }}层</small></h3></div><strong class="bb-person-status" :class="row.zero ? 'bb-zero' : row.low || row.status === 'behind' ? 'bb-tone-behind' : row.reached ? 'bb-tone-reached' : 'bb-muted'">{{ row.missingProduction ? '暂无数据' : row.missingTarget ? '缺目标' : row.zero ? '零产' : row.low ? '低产' : row.reached ? '已达时序' : `缺 ${format(row.gap)} 条` }}</strong></header>
          <div class="bb-person-job"><span>{{ row.role || '岗位未提供' }}</span><span>{{ activeCategory?.unit === '人' ? '工号' : '编码' }} {{ row.identity }}</span></div>
          <p class="bb-person-line"><i class="bb-detail-icon" :style="detailIconStyle('location')" aria-hidden="true"></i><span>{{ [row.branch,row.grid].filter(Boolean).join(' · ') || '组织未提供' }}</span></p>
          <p v-if="row.location" class="bb-person-line bb-person-shop"><i class="bb-detail-icon" :style="detailIconStyle('store')" aria-hidden="true"></i><span>{{ row.location }}</span></p>
          <div class="bb-person-values"><span>已完成<b>{{ format(row.production) }} <small>条</small></b></span><span>时序应达<b>{{ whole(row.expected) }} <small>条</small></b></span><span>月目标缺口<b :class="{'bb-gap-value':row.gap>0}">{{ format(row.gap) }} <small>条</small></b></span></div>
          <footer class="bb-person-footer"><div><span>月目标 <b>{{ format(row.monthlyTarget) }}</b> 条</span><span>月完成率 <b>{{ percent(row.completionRate) }}</b></span></div><div class="bb-person-progress" :role="finiteValue(row.completionRate)===null ? undefined : 'progressbar'" aria-label="月目标完成进度" :aria-valuenow="finiteValue(row.completionRate)===null ? undefined : Math.min(100,Math.max(0,Number(row.completionRate)))" aria-valuemin="0" aria-valuemax="100" :aria-valuetext="percent(row.completionRate)"><i :style="{width:fill(row.completionRate)}"></i></div></footer>
        </article>
        <p v-if="!busy && !detailRows.length" class="bb-empty">{{ stats.evaluatedCount === 0 && status === 'behind' ? '暂无可评估对象，请核对目标和产能记录。' : '当前筛选条件下暂无对象。' }}</p>
        <button v-if="data.pagination?.hasMore" type="button" class="bb-more" :disabled="busy" @click="nextPage">{{ busy ? '加载中…' : '查看更多' }}</button>
      </div>
    </template>
  </section>
</template>

<script setup>
import {computed,inject,nextTick,onMounted,onUnmounted,reactive,ref,watch} from 'vue'
import {fetchBroadbandOverview,fetchBroadbandRegions,fetchBroadbandDetails} from '../api/production.js'
import {createBroadbandEngine} from '../utils/broadband.js'
import {monitorBranchOptions} from '../utils/monitorBranches.js'
import {branchGridRanking} from '../utils/branchGridRanking.js'
import {finiteValue,percent,fill,tone as rateTone} from '../utils/broadbandDisplay.js'
import detailPersonIcon from '../assets/ui-icons/user-round.svg'
import detailStoreIcon from '../assets/ui-icons/store.svg'
import detailLocationIcon from '../assets/ui-icons/map-pin.svg'
const emit=defineEmits(['back-to-workbench','navigation-change'])
const props=defineProps({permission:{type:Object,required:true},organization:{type:Object,required:true},statDate:String,scope:String,token:String,navigationState:{type:Object,default:null}})
const engine=createBroadbandEngine(),view=ref('overview'),categoryId=ref(''),data=ref(null),error=ref(''),busy=ref(false),detailRows=ref([]),status=ref('focus'),tier=ref(''),query=ref(''),page=ref(1)
const filters=reactive({branch:props.permission.role==='city'?'':props.permission.branchName||props.permission.branchId||'',grid:props.permission.role==='grid'?props.permission.gridName||'':''})
const detailResults=ref(null)
const history=[],statuses=[{id:'all',name:'全部'},{id:'focus',name:'重点关注'},{id:'behind',name:'未达时序'},{id:'zero',name:'零产'},{id:'low',name:'低产'}]
let sequence=0,searchTimer
const browserNavigation=inject('wgsc-browser-navigation',null)
let applyingNavigation=false
function navigationSnapshot(){return {view:view.value,categoryId:categoryId.value,branch:filters.branch,grid:filters.grid,status:status.value,tier:tier.value,query:query.value}}
function applyNavigation(state){
 if(!state)return
 view.value=['overview','regions','details'].includes(state.view)?state.view:'overview';categoryId.value=state.categoryId||''
 filters.branch=props.permission.role==='city'?state.branch||'':props.permission.branchName||props.permission.branchId||''
 filters.grid=props.permission.role==='grid'?props.permission.gridName||'':state.grid||''
 status.value=state.status||'focus';tier.value=state.tier||'';query.value=state.query||''
}
applyNavigation(props.navigationState)
watch(()=>props.navigationState,async state=>{
 if(!state || JSON.stringify(state)===JSON.stringify(navigationSnapshot()))return
 applyingNavigation=true;clearTimeout(searchTimer);applyNavigation(state);history.length=0
 await nextTick();clearTimeout(searchTimer);applyingNavigation=false;load(false)
})
watch(()=>JSON.stringify(navigationSnapshot()),()=>{if(!applyingNavigation)emit('navigation-change',navigationSnapshot())},{immediate:true,flush:'post'})
const clock=computed(()=>data.value?.clock)
const activeCategory=computed(()=>categoryId.value?engine.category(categoryId.value):null)
const stats=computed(()=>data.value?.stats||{})
const branchAnalysis=computed(()=>Boolean(filters.branch) || props.permission.role === 'branch')
const branchRanking=computed(()=>branchGridRanking(data.value?.rankingAnalysis))
const scopeLabel=computed(()=>[filters.branch||props.scope||'当前权限范围',filters.grid||''].filter(Boolean).join(' · '))
const branchOptions=computed(()=>monitorBranchOptions(props.organization.branches))
const gridOptions=computed(()=>{const branch=props.organization.branches.find(b=>(b.branchName||b.branchId)===filters.branch);return props.organization.grids.filter(g=>g.branchId===(branch?.branchId||filters.branch))})
const format=v=>finiteValue(v)===null?'—':finiteValue(v).toLocaleString('zh-CN',{maximumFractionDigits:2})
const rankLabel=r=>r?`${r.name}（${percent(r.completionRate)}）`:'暂无可评估数据'
const whole=v=>finiteValue(v)===null?'—':Math.round(finiteValue(v)).toLocaleString('zh-CN')
const cadences={contractors:'至少1天1条',managers:'2天1条',clerks:'3天1条',installers:'4天1条',stars:'5天1条',residents:'6天1条'}
const signedPercent=v=>`${v>0?'+':''}${percent(v)}`
const tone=s=>rateTone(s,clock.value?.timeProgress)
const detailIconStyle=name=>({'--bb-detail-icon':`url("${({person:detailPersonIcon,store:detailStoreIcon,location:detailLocationIcon})[name]}")`})
async function load(append=false,keepContent=false) {
 const id=++sequence;busy.value=true;error.value=''
 if(!append) {if(!keepContent){data.value=null;detailRows.value=[]}page.value=1}
 const params={phone:props.permission.phone,statDate:props.statDate||'',branch:filters.branch,grid:filters.grid,categoryId:categoryId.value,status:status.value,tier:tier.value,query:query.value,page:page.value,pageSize:20,level:!filters.branch&&props.permission.role==='city'?'branch':'grid'}
 try {const response=await (view.value==='overview'?fetchBroadbandOverview:view.value==='regions'?fetchBroadbandRegions:fetchBroadbandDetails)(params,props.token);if(id!==sequence)return;data.value=response;if(view.value==='details')detailRows.value=append?[...detailRows.value,...response.rows]:response.rows}
 catch(e){if(id===sequence){error.value=e.message||'宽带一号工程专项查询失败';if(append)page.value=Math.max(1,page.value-1)}}
 finally{if(id===sequence)busy.value=false}
}
function save(){history.push({view:view.value,categoryId:categoryId.value,branch:filters.branch,grid:filters.grid,status:status.value,tier:tier.value,query:query.value})}
function back(){if(browserNavigation?.back())return;clearTimeout(searchTimer);const previous=history.pop();if(previous){view.value=previous.view;categoryId.value=previous.categoryId;filters.branch=previous.branch;filters.grid=previous.grid;status.value=previous.status;tier.value=previous.tier||'';query.value=previous.query}else{view.value='overview';categoryId.value=''};load(false);window.scrollTo(0,0)}
function openCategory(id){save();categoryId.value=id;view.value='regions';load(false);window.scrollTo(0,0)}
function openRegion(region){save();filters.branch=region.branch;filters.grid=region.grid;if(data.value.level==='grid'){view.value='details';status.value='focus';tier.value='';query.value=''};load(false);window.scrollTo(0,0)}
function openDetails(){save();view.value='details';status.value='focus';tier.value='';query.value='';load(false);window.scrollTo(0,0)}
function changeBranch(){filters.grid='';changeFilters()}
function changeFilters(){history.length=0;load(false)}
function setStatus(value){clearTimeout(searchTimer);status.value=value;tier.value='';load(false,true)}
async function showFocus(value){
 const inDetails=view.value==='details'
 if(!inDetails)save()
 view.value='details';status.value=value;tier.value='';query.value=''
 await nextTick();clearTimeout(searchTimer)
 await load(false,inDetails)
 await nextTick()
 if(!error.value && detailResults.value)detailResults.value.scrollIntoView({behavior:'smooth',block:'start'})
}
function selectTier(value){if(view.value!=='details')save();view.value='details';status.value='all';tier.value=value;query.value='';load(false)}
function nextPage(){if(busy.value||!data.value?.pagination?.hasMore)return;page.value++;load(true)}
watch(query,()=>{if(applyingNavigation || view.value!=='details')return;clearTimeout(searchTimer);sequence++;busy.value=true;searchTimer=setTimeout(()=>load(false,true),250)})
watch(()=>props.statDate,()=>load(false))
onMounted(()=>load(false))
onUnmounted(()=>{sequence++;clearTimeout(searchTimer)})
</script>

<style scoped>
.bb-page{margin:0 -14px;padding:0 14px 24px;color:#19355b}.bb-hero{display:flex;align-items:center;gap:10px;margin:0 -14px;padding:18px;background:linear-gradient(110deg,#1877ed,#2c8db6);color:#fff}.bb-hero h2{margin:0;font-size:23px}.bb-hero p{margin:6px 0 0;font-size:12px;color:#e2f2ff}.bb-back{border:0;background:transparent;color:#fff;font-size:34px;padding:0 6px;line-height:1}.bb-demo{margin-left:auto;font-size:11px;border:1px solid #9dd3ff;border-radius:4px;padding:3px 6px;white-space:nowrap}.bb-scope{display:flex;justify-content:space-between;gap:8px;padding:13px 1px;font-size:12px;color:#607998}.bb-scope strong{color:#214373}.bb-filters{display:flex;align-items:flex-end;gap:8px;margin-bottom:12px}.bb-filters label{display:grid;gap:5px;min-width:0;flex:1;font-size:11px;color:#607998}.bb-filters select{width:100%;min-width:0;height:37px;padding:0 6px;background:#fff;border:1px solid #d1e3fa;border-radius:6px;color:#214373;font-size:12px}.bb-refresh{height:37px;padding:0 12px;border:1px solid #bad7ff;border-radius:6px;background:#fff;color:#1672ed;font-weight:700}.bb-time{display:flex;align-items:center;flex-wrap:wrap;gap:5px 12px;padding:11px 13px;margin-bottom:12px;border-radius:7px;background:#e3f1ff;color:#2057a0;font-size:12px}.bb-time strong{color:#0753c6;font-size:14px}.bb-time small{flex-basis:100%;font-size:11px;color:#54769e}.bb-category-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.bb-category{display:block;min-width:0;padding:13px 12px;border:1px solid #dceafa;border-radius:9px;background:#fff;box-shadow:0 3px 12px #276cc007;text-align:left;color:#173052;font:inherit;cursor:pointer}.bb-category header{display:flex;align-items:center;gap:5px;justify-content:space-between;min-height:38px;margin-bottom:9px}.bb-category h3{margin:0;font-size:15px;line-height:1.4;color:#173052}.bb-chevron{font-size:23px;color:#4c88ce}.bb-rate-label{font-size:11px;color:#71849d}.bb-main-rate{display:block;margin:3px 0 9px;font-size:30px;line-height:1.15;white-space:nowrap}.bb-tone-reached{color:#079e8c}.bb-tone-behind{color:#ec7c27}.bb-tone-unknown,.bb-muted{color:#71849d}.bb-progress{position:relative;height:6px;border-radius:9px;background:#e4ecf7;overflow:visible}.bb-progress i{display:block;height:100%;max-width:100%;border-radius:inherit;background:currentColor}.bb-progress b{position:absolute;top:-3px;width:1px;height:12px;background:#526b8a;transform:translateX(-1px)}.bb-target-note{margin:9px 0 3px;font-size:11px;color:#59718f;line-height:1.5}.bb-cadence{min-height:16px;margin:0;font-size:11px;color:#71849d;line-height:1.5}.bb-attainment{display:flex;justify-content:space-between;flex-wrap:wrap;gap:3px;margin:10px 0 7px;font-size:11px;color:#526d90}.bb-attainment b{color:#21569b}.bb-category footer{display:flex;justify-content:space-between;gap:4px;padding-top:7px;border-top:1px solid #eff4fb;font-size:10px;color:#71849d}.bb-zero{color:#d93642}.bb-incomplete{display:block;margin-top:6px;font-size:10px;line-height:1.5;color:#8f6e45}.bb-legend{display:flex;align-items:center;justify-content:center;gap:5px;margin:14px 0 10px;font-size:10px;color:#607998;flex-wrap:wrap}.bb-legend>span{width:7px;height:7px;margin-left:6px;border-radius:50%}.bb-green-dot{background:#079e8c}.bb-orange-dot{background:#ec7c27}.bb-red-dot{background:#d93642}.bb-footnote{margin:0;padding:10px 12px;background:#eaf4ff;border-radius:6px;color:#587392;font-size:11px;line-height:1.7}.bb-warning,.bb-quality{padding:10px 12px;margin:9px 0;border-radius:6px;background:#fff2dc;color:#8e632b;font-size:12px;line-height:1.7}.bb-quality small{display:block;font-size:11px}.bb-quality button{border:0;background:transparent;color:#986018;font:inherit;padding:4px 0}.bb-error{display:grid;gap:8px;padding:15px;background:#fff0f0;border:1px solid #f2c9ce;border-radius:7px;font-size:13px;color:#b33e48;line-height:1.7}.bb-error button{justify-self:start;border:1px solid #e7b6bb;background:#fff;border-radius:4px;color:inherit;padding:5px 12px}.bb-loading{padding:10px;text-align:center;color:#607998;font-size:13px}.bb-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:14px 0 10px}.bb-summary>div{padding:13px;border-radius:8px;background:#fff;border:1px solid #e0ecfa}.bb-summary span{display:block;color:#607998;font-size:12px}.bb-summary strong{display:block;margin-top:7px;font-size:27px;line-height:1.2}.bb-target-summary{display:flex;flex-wrap:wrap;gap:6px 12px;padding:10px 12px;border-radius:6px;background:#e7f3ff;font-size:12px;line-height:1.7;color:#46658a}.bb-trends{margin:12px 0;padding:11px 12px;border:1px solid #dceafa;border-radius:7px;background:#fff;font-size:12px;color:#607998}.bb-trends summary{cursor:pointer;color:#2462a9;font-weight:700}.bb-trends div{display:flex;justify-content:space-between;gap:10px;margin-top:10px;line-height:1.5}.bb-trends b{font-weight:600;text-align:right}.bb-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:16px 0 8px}.bb-section-head h3{margin:0;font-size:17px;color:#173052}.bb-section-head>span{font-size:10px;color:#71849d}.bb-region-row{display:grid;grid-template-columns:18px minmax(48px,.65fr) minmax(0,1.5fr) auto;gap:7px;align-items:center;width:100%;padding:13px 5px;border:0;border-bottom:1px solid #dfeafa;background:transparent;font:inherit;color:#234367;text-align:left;cursor:pointer}.bb-rank{font-size:12px;color:#71849d}.bb-region-row>strong{font-size:13px;overflow-wrap:anywhere}.bb-region-row>div>span{display:block;margin-bottom:5px;font-size:12px}.bb-region-row>div>small{display:block;margin-top:6px;font-size:10px;line-height:1.4;color:#71849d}.bb-region-row>b{font-size:17px;text-align:right;white-space:nowrap}.bb-region-row>b>small{display:block;margin-top:4px;font-size:9px;font-weight:500;color:#71849d}.bb-primary{border:0;border-radius:6px;background:#1975ed;color:#fff;padding:12px;font:inherit;font-weight:700}.bb-detail-entry{width:100%;margin-top:15px;font-size:13px}.bb-distribution{margin:14px 0;padding:0 12px 11px;background:#fff;border:1px solid #deebfa;border-radius:8px}.bb-distribution .bb-section-head{padding-top:14px;margin-top:0}.bb-distribution .bb-section-head h3{font-size:15px}.bb-bars{display:flex;align-items:flex-end;justify-content:space-between;gap:7px;min-height:126px;padding:10px 2px 0;border-bottom:1px solid #e4edf9}.bb-bars>div{display:flex;flex:1;min-width:0;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px}.bb-bars>div>span{font-size:12px;color:#19355b}.bb-bars i{display:block;width:75%;min-width:14px;border-radius:4px 4px 0 0;background:#69b7ff}.bb-bars .bb-bin-zero i{background:#ef6870}.bb-bars .bb-bin-quarter i{background:#ffa052}.bb-bars .bb-bin-above i{background:#1675fa}.bb-bars small{display:block;min-height:26px;font-size:9px;text-align:center;line-height:1.4;color:#607998}.bb-distribution>p{margin:9px 0 0;color:#a6643c;font-size:10px;line-height:1.6}.bb-status-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0 10px}.bb-status-tabs button{padding:10px 4px;border:0;border-radius:6px;background:#e3efff;color:#4c6c95;font:inherit;font-size:13px;font-weight:700}.bb-status-tabs .active{background:#1675f7;color:#fff}.bb-search{display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid #c9ddf7;border-radius:7px;background:#fff}.bb-search>span{font-size:25px;color:#7592b6}.bb-search input{width:100%;min-width:0;height:40px;border:0;background:transparent;outline:none;font:inherit;font-size:12px}.bb-search button{border:0;background:transparent;color:#71849d;font-size:22px}.bb-result-count{display:flex;justify-content:space-between;gap:6px;margin:12px 0;color:#607998;font-size:11px}.bb-result-count span{color:#8296af;font-size:10px}.bb-person{margin-bottom:10px;padding:13px;border:1px solid #deebfa;border-radius:8px;background:#fff}.bb-person header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.bb-person header>div{min-width:0}.bb-person h3{margin:0;font-size:15px;color:#173052;overflow-wrap:anywhere}.bb-person header p{margin:5px 0 0;font-size:10px;line-height:1.6;color:#607998;overflow-wrap:anywhere}.bb-person header>strong{flex:0 0 auto;font-size:14px}.bb-organization{margin:6px 0 11px;color:#71849d;font-size:11px;line-height:1.6}.bb-person-values{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:10px 0;border-top:1px solid #edf3fb;border-bottom:1px solid #edf3fb}.bb-person-values span{font-size:10px;color:#71849d}.bb-person-values b{display:block;margin-top:5px;color:#234367;font-size:14px}.bb-person footer{margin-top:9px;font-size:10px;color:#71849d}.bb-person-zero{border-left:3px solid #ef6870}.bb-empty{padding:23px 12px;text-align:center;font-size:13px;line-height:1.8;color:#71849d}.bb-more{display:block;margin:15px auto;padding:9px 18px;border:1px solid #bed7f7;border-radius:6px;background:#fff;color:#226aca;font:inherit;font-size:13px}button:disabled{opacity:.55;cursor:wait}button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid #62a5ff;outline-offset:2px}@media(max-width:360px){.bb-page{margin:0 -11px;padding:0 11px 24px}.bb-hero{margin:0 -11px}.bb-category{padding:11px 9px}.bb-category h3{font-size:14px}.bb-main-rate{font-size:27px}.bb-category-grid{gap:8px}.bb-region-row{grid-template-columns:15px minmax(42px,.65fr) minmax(0,1.4fr) auto;gap:5px}.bb-region-row>b{font-size:15px}.bb-target-summary{font-size:11px}}
/* Compact metric cards follow the regional dashboard reference. */
.bb-hero{padding:15px 18px;background:linear-gradient(110deg,#197fe5,#2c83b9)}
.bb-hero h2{font-size:24px;line-height:1.35;font-weight:800}
.bb-inner-page .bb-hero{padding:12px 15px;min-height:54px;box-sizing:border-box}
.bb-inner-page .bb-hero h2{font-size:22px}
.bb-inner-page .bb-back{font-size:31px;margin-right:3px}
.bb-scope{font-size:14px;line-height:1.5;padding:12px 1px}
.bb-filters{gap:10px}.bb-filters label{font-size:14px;font-weight:600}
.bb-filters select{height:42px;font-size:15px;border-radius:8px;padding:0 10px}
.bb-refresh{height:42px;font-size:15px;border-radius:8px}
.bb-time{font-size:14px;gap:5px 12px;padding:10px 12px;line-height:1.5}
.bb-time strong{font-size:16px}.bb-time small{font-size:13px}
.bb-inner-page .bb-time{background:#eaf4ff;margin-bottom:10px}
.bb-inner-page .bb-time small{flex-basis:auto;font-size:12px}
.bb-summary{gap:10px;margin:10px 0;background:white;padding:7px;border-radius:13px}
.bb-summary>.bb-metric{position:relative;min-width:0;min-height:91px;box-sizing:border-box;border:0;border-radius:10px;padding:12px 46px 12px 13px;overflow:hidden;background:linear-gradient(115deg,#eaf4ff,#f3f9ff)}
.bb-metric>span{position:relative;z-index:1;font-size:15px;line-height:1.45;color:#3b577f;font-weight:700;white-space:nowrap}
.bb-metric>strong{position:relative;z-index:1;font-size:30px;line-height:1.15;margin-top:5px;font-weight:800;letter-spacing:-.5px;white-space:nowrap;font-variant-numeric:tabular-nums}
.bb-metric strong small{font-size:16px;margin-left:4px;letter-spacing:0;font-weight:700}
.bb-metric-icon{position:absolute;right:11px;top:50%;transform:translateY(-50%);width:33px;height:33px;fill:currentColor;color:#91c3ff}
.bb-summary>.bb-metric-rate{background:linear-gradient(115deg,#fff4e8,#f4f7fb)}
.bb-metric-rate .bb-metric-icon{color:#ff9651;width:29px;height:29px}
.bb-summary>.bb-metric-gap{background:linear-gradient(115deg,#fff5ee,#fff0ef)}
.bb-metric-gap .bb-metric-icon{color:#ff835d}
.bb-summary .bb-tone-reached strong{color:#079e8c}
.bb-summary .bb-tone-behind strong{color:#f47923}
.bb-summary .bb-tone-unknown strong{color:#71849d}
.bb-target-summary{font-size:14px;gap:3px 12px;line-height:1.8;padding:9px 12px;background:#eaf4ff;border-radius:8px}
.bb-target-summary b{font-weight:750;color:#234571}
.bb-quality{font-size:14px}.bb-quality small{font-size:13px}
.bb-trends{font-size:14px;line-height:1.6;border-radius:9px;padding:12px}
.bb-section-head h3{font-size:20px}.bb-section-head>span{font-size:12px}
.bb-regions{background:white;border-radius:12px;padding:1px 12px 12px;margin-top:12px}
.bb-region-row{padding:14px 0;gap:8px;grid-template-columns:18px minmax(55px,.8fr) minmax(0,1.4fr) auto}
.bb-region-row>strong{font-size:15px}.bb-rank{font-size:14px}
.bb-region-row>div>span{font-size:14px}.bb-region-row>div>small{font-size:12px}
.bb-region-row>b{font-size:20px}.bb-region-row>b>small{font-size:11px}
.bb-detail-entry{font-size:15px}.bb-person h3{font-size:18px}
.bb-person header p,.bb-person footer{font-size:13px}.bb-person header>strong{font-size:16px}
.bb-organization{font-size:14px}.bb-person-values span{font-size:13px}
.bb-person-values b{font-size:18px}.bb-result-count{font-size:14px}.bb-result-count span{font-size:12px}
.bb-search input{font-size:15px;height:44px}.bb-status-tabs button{font-size:15px}
.bb-distribution .bb-section-head h3{font-size:18px}.bb-distribution>p{font-size:12px}
.bb-bars small{font-size:12px}.bb-bars>div>span{font-size:15px}
.bb-category h3{font-size:17px}.bb-rate-label{font-size:13px}
.bb-target-note,.bb-cadence{font-size:13px}.bb-attainment{font-size:13px}
.bb-category footer,.bb-incomplete{font-size:12px}.bb-footnote{font-size:13px}
.bb-legend{font-size:12px}
@media(max-width:360px){
 .bb-summary{gap:7px;padding:5px}.bb-summary>.bb-metric{padding:10px 33px 10px 9px;min-height:85px}
 .bb-metric>span{font-size:13px}.bb-metric>strong{font-size:25px}.bb-metric strong small{font-size:14px}
 .bb-metric-icon{right:6px;width:25px;height:25px}.bb-metric-rate .bb-metric-icon{width:23px;height:23px}
 .bb-target-summary{font-size:13px}.bb-category h3{font-size:16px}
 .bb-region-row{grid-template-columns:14px minmax(45px,.7fr) minmax(0,1.5fr) auto;gap:5px}
 .bb-region-row>strong,.bb-region-row>div>span{font-size:13px}.bb-region-row>b{font-size:17px}
}
.bb-focus-banner{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:12px 0;padding:12px;border-radius:10px;background:#fff1e9;color:#a34d21;font-size:14px}
.bb-focus-banner>strong{font-size:15px}.bb-focus-banner button{border:0;border-radius:6px;background:#fff;padding:6px 9px;color:#c44830;font:inherit}.bb-focus-banner b{font-size:19px}.bb-focus-banner small{flex-basis:100%;font-size:12px;color:#9b705b}
.bb-percent-bars{align-items:stretch;gap:6px;min-height:0;padding-bottom:7px}
.bb-percent-bars>button{display:flex;flex:1;min-width:0;flex-direction:column;align-items:center;gap:5px;padding:6px 1px;border:0;border-radius:7px;background:transparent;color:#3b577f;font:inherit;cursor:pointer}
.bb-percent-bars>button.active{background:#e9f3ff;box-shadow:inset 0 0 0 1px #6ba9f7}
.bb-percent-bars strong{font-size:15px;font-weight:800;font-variant-numeric:tabular-nums}.bb-percent-bars b{font-size:14px}.bb-percent-bars small{font-size:11px;min-height:16px;white-space:nowrap}.bb-percent-bars span{font-size:12px}
.bb-percent-bars .bb-bar-track{position:relative;display:flex;align-items:flex-end;justify-content:center;width:100%;height:100px;background:linear-gradient(to top,#e7eef8 1px,transparent 1px);background-size:100% 25%;border-bottom:1px solid #d4e1f2}
.bb-percent-bars .bb-bar-track i{width:70%;height:0;min-width:0;border-radius:4px 4px 0 0}
.bb-bin-E{--tier-color:#ef6976}.bb-bin-D{--tier-color:#ff9a4c}.bb-bin-C{--tier-color:#78b9fc}.bb-bin-B{--tier-color:#358ded}.bb-bin-A{--tier-color:#09a68f}
.bb-percent-bars .bb-bar-track i,.bb-region-levels i{background:var(--tier-color)}
.bb-region-card{padding-bottom:12px;margin-bottom:8px;border-bottom:1px solid #e1ebf8}.bb-region-card:last-of-type{border-bottom:0}
.bb-region-card .bb-region-row{border-bottom:0}.bb-region-levels{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;padding:6px 4px 0;border-radius:8px;background:#f6faff}
.bb-region-levels>div{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;padding-bottom:8px}
.bb-region-levels strong{font-size:14px;color:#2e4f77;white-space:nowrap}.bb-region-levels b{font-size:12px;color:#49678d}.bb-region-levels small{font-size:11px;color:#71849d}
.bb-mini-track{height:50px;width:100%;display:flex;align-items:flex-end;justify-content:center;background:linear-gradient(to top,#e3edf8 1px,transparent 1px);background-size:100% 50%}
.bb-mini-track i{display:block;width:60%;border-radius:3px 3px 0 0}
.bb-tier-tag{display:inline-block;padding:3px 7px;border-radius:5px;background:color-mix(in srgb,var(--tier-color) 14%,white);color:var(--tier-color);font-size:13px;vertical-align:middle;white-space:nowrap}
.bb-person-low{border-left:3px solid #ff9a4c}.bb-tier-selection{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#2a67af}.bb-tier-selection button{border:0;background:transparent;color:#3679c9;font:inherit;font-size:13px}
.bb-status-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:3px}.bb-status-tabs button{flex:1 0 auto;white-space:nowrap;padding:10px 9px;font-size:14px}
@media(max-width:360px){.bb-percent-bars strong{font-size:13px}.bb-percent-bars small{font-size:10px}.bb-region-levels strong{font-size:12px}.bb-distribution .bb-section-head h3{font-size:16px}.bb-category footer{flex-wrap:wrap}}
/* Confirmed single-column dispatch layout. */
.bb-overview{background:linear-gradient(150deg,#f2f8ff,#e9f2fb);padding-bottom:26px}
.bb-overview .bb-hero{padding:19px 18px;background:linear-gradient(110deg,#0676ed,#0758ba);border-radius:0 0 12px 12px}
.bb-overview .bb-hero h2{font-size:27px}.bb-overview .bb-hero p{font-size:14px;letter-spacing:.3px}
.bb-overview .bb-scope{align-items:center;padding:16px 2px 12px;font-size:14px}
.bb-overview .bb-scope strong{padding:5px 10px;border:1px solid #d3e3f7;background:#f9fcff;border-radius:7px}
.bb-dispatch-note{display:flex;gap:8px;align-items:center;padding:11px 13px;margin:14px 0;border-radius:9px;background:linear-gradient(90deg,#e0efff,#fff);color:#c8473d;font-size:15px}
.bb-dispatch-note svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.bb-overview .bb-time{justify-content:space-between;padding:13px 15px;margin:0 0 16px;border-radius:11px;background:linear-gradient(100deg,#d6eeff,#cce7ff);gap:9px}
.bb-overview .bb-time strong{font-size:17px;color:#153967}.bb-overview .bb-time strong b{color:#f47a1c;font-size:25px;font-weight:800;letter-spacing:-.6px;margin-left:3px}
.bb-overview .bb-time>span{font-size:14px;color:#2c4b72;font-weight:600;white-space:nowrap}
.bb-clock-progress{flex-basis:100%;height:8px;padding:2px;border-radius:20px;background:#fff}
.bb-clock-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2e9bff,#0964f6)}
.bb-overview .bb-category-grid{grid-template-columns:minmax(0,1fr);gap:13px}
.bb-overview .bb-category{position:relative;display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:10px 12px;align-items:center;padding:16px 14px;border:0;border-radius:12px;background:linear-gradient(120deg,#fff,#fcfdff);box-shadow:0 4px 18px #204b7710}
.bb-category-icon{grid-column:1;grid-row:1/4;position:relative;display:flex;align-items:center;justify-content:flex-start;align-self:stretch;border-right:2px solid #abcff6;color:#153c70;padding-right:8px}
.bb-category-icon svg{width:32px;height:38px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;overflow:visible}
.bb-overview .bb-category header{grid-column:2;grid-row:1;display:flex;align-items:center;justify-content:flex-start;gap:7px;min-height:0;margin:0;white-space:nowrap}
.bb-overview .bb-category h3{font-size:clamp(16px,3.9vw,22px);line-height:1.35;font-weight:800;letter-spacing:-.35px}
.bb-cadence-tag{font-size:clamp(11px,2.7vw,13px);color:#35618f;background:#e3effc;border-radius:5px;padding:3px 6px;line-height:1.4;white-space:nowrap;font-weight:700}
.bb-overview .bb-main-rate{grid-column:3;grid-row:1;font-size:clamp(27px,6.8vw,36px);margin:0;line-height:1;color:#f47b1b;letter-spacing:-.8px;font-variant-numeric:tabular-nums}
.bb-overview .bb-category.bb-tone-reached .bb-main-rate{color:#079e8c}.bb-overview .bb-category.bb-tone-unknown .bb-main-rate{color:#71849d}
.bb-overview .bb-category>.bb-progress{grid-column:2/4;grid-row:2;height:7px;margin:1px 0;background:#d5e0ed}
.bb-overview .bb-category>.bb-progress i{background:linear-gradient(90deg,#ff8e2f,#f27c1f)}
.bb-overview .bb-category.bb-tone-reached>.bb-progress i{background:linear-gradient(90deg,#25c2ae,#079e8c)}
.bb-overview .bb-category>.bb-progress b{background:#6284aa;top:-2px;height:11px}
.bb-overview .bb-category>.bb-row-stats{grid-column:2/4;grid-row:3;display:grid;grid-template-columns:1.1fr 1.3fr .9fr .9fr;gap:6px;padding:0;border:0;font-size:clamp(12px,2.8vw,14px);line-height:1.5}
.bb-row-stats>span{display:flex;justify-content:center;align-items:baseline;gap:3px;padding:4px 3px;border-radius:6px;color:#254b7a;background:#e6f0fb;white-space:nowrap}
.bb-row-stats b{font-weight:800;letter-spacing:-.3px;font-variant-numeric:tabular-nums}
.bb-row-stats>.bb-stat-zero{background:#ffedf0;color:#c93343}.bb-row-stats>.bb-stat-low{background:#fff0dc;color:#bd6518}
.bb-overview .bb-incomplete{grid-column:2/4;margin:0;color:#96703f;font-size:12px;line-height:1.5}
.bb-overview .bb-legend{margin-top:18px}.bb-overview .bb-footnote{font-size:12px;color:#6b819c;background:#f6faff}
@media(max-width:430px){
 .bb-overview .bb-category{grid-template-columns:31px minmax(0,1fr) auto;gap:10px 8px;padding:14px 11px}
 .bb-category-icon{grid-row:1/3;padding-right:6px}.bb-category-icon svg{width:25px;height:30px}
 .bb-overview .bb-category header{gap:5px}.bb-cadence-tag{padding:3px 4px}
 .bb-overview .bb-category>.bb-row-stats{grid-column:1/4;font-size:12px}
 .bb-overview .bb-category h3{font-size:17px}
 .bb-overview .bb-main-rate{font-size:27px}
}
@media(max-width:360px){
 .bb-overview .bb-category{grid-template-columns:25px minmax(0,1fr) auto;gap:9px 6px;padding:13px 9px}
 .bb-category-icon svg{width:20px;height:27px}.bb-overview .bb-category h3{font-size:14px;letter-spacing:-.5px}
 .bb-cadence-tag{font-size:10px;padding:2px 3px}.bb-overview .bb-main-rate{font-size:24px}
 .bb-overview .bb-category>.bb-row-stats{font-size:11px;gap:4px}.bb-row-stats>span{gap:2px;padding:4px 2px}
 .bb-overview .bb-time{padding:11px}.bb-overview .bb-time strong{font-size:15px}.bb-overview .bb-time strong b{font-size:23px}.bb-overview .bb-time>span{font-size:12px}
}
/* Match the selected visual: heavy sans type, compact masthead and inline filters. */
.bb-page{font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif}
.bb-page button,.bb-page select{font-family:inherit}
.bb-inner-crumb{display:flex;align-items:center;gap:9px;padding:13px 0;font-size:16px;font-weight:700;color:#15345f}
.bb-inner-crumb button,.bb-info-row nav button{border:0;background:transparent;padding:0;color:inherit;font:inherit;cursor:pointer}
.bb-overview{background:linear-gradient(135deg,#eaf3fe,#e1ecf9);padding-top:0}
.bb-brand-header{display:flex;align-items:center;gap:20px;min-height:66px;padding:13px 22px;margin:0 -14px;background:linear-gradient(110deg,#1e80f3,#0057d5);color:#fff;border-radius:22px 22px 0 0;box-sizing:border-box}
.bb-mobile-brand{display:flex;align-items:center;gap:7px;padding-right:20px;border-right:1px solid #c5ddff;flex:0 0 auto}
.bb-mobile-brand svg{width:35px;height:35px}.bb-mobile-brand span{display:flex;flex-direction:column;align-items:flex-start;line-height:1.15;white-space:nowrap}
.bb-mobile-brand b{font-size:18px;font-weight:700;letter-spacing:1px}.bb-mobile-brand small{font:11px/1.2 Arial,sans-serif}
.bb-brand-header h2{margin:0;font-size:clamp(23px,5.1vw,34px);line-height:1.2;white-space:nowrap;font-weight:900;letter-spacing:.2px;-webkit-text-stroke:.25px currentColor}
.bb-info-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:7px;color:#0d305f;font-size:clamp(10px,2.5vw,14px);font-weight:700;margin:0 -14px 14px;padding:9px 12px;background:linear-gradient(90deg,#f6fbff,#e9f3ff)}
.bb-info-row nav{display:flex;gap:6px;align-items:center;white-space:nowrap}.bb-info-row nav strong{font-weight:800}
.bb-info-scope,.bb-info-date{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.bb-info-scope{padding:2px 5px;border:1px solid #d0e0f8;border-radius:5px;background:#eef6ff}
.bb-info-row svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.bb-info-row em{padding:3px 6px;background:#cce2ff;color:#0061ed;border-radius:4px;font-size:11px;font-style:normal}
.bb-overview .bb-dispatch-note{display:flex;align-items:stretch;padding:0;gap:0;margin:0 0 11px;background:linear-gradient(90deg,#e9f5ff,#fff);border-radius:9px;overflow:hidden}
.bb-dispatch-title{display:flex;align-items:center;justify-content:center;flex:0 0 36%;padding:8px 5px;background:linear-gradient(100deg,#1688e7,#0060aa);clip-path:polygon(0 0,100% 0,91% 100%,0 100%);font-size:clamp(19px,4.5vw,29px);letter-spacing:1px;color:white;font-weight:900;-webkit-text-stroke:.2px currentColor}
.bb-overview .bb-dispatch-note>span{align-self:center;margin-left:12px;padding-left:13px;border-left:2px solid #1679f3;font-size:clamp(12px,3.1vw,20px);font-weight:800;color:#e4353d;white-space:nowrap}
.bb-filter-colon{display:none}.bb-overview .bb-filter-colon{display:inline}
.bb-overview .bb-filters{align-items:center;gap:13px;margin:0 8px 14px}
.bb-overview .bb-filters label{display:flex;align-items:center;gap:0;flex:1;min-width:0;font-size:clamp(13px,3.05vw,19px);color:#12315d;font-weight:800;white-space:nowrap}
.bb-overview .bb-filters label>span{flex:0 0 auto}
.bb-overview .bb-filters select{width:0;flex:1;min-width:0;height:36px;padding:0 8px;border:1px solid #b8cde9;border-radius:6px;background:#fff;color:#09264d;font-size:clamp(13px,3vw,18px);font-weight:700}
.bb-refresh{display:flex;align-items:center;justify-content:center}.bb-refresh svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.bb-overview .bb-refresh{height:36px;width:33px;flex:0 0 33px;border:0;background:transparent;color:#0879ff;padding:0}.bb-overview .bb-refresh svg{width:30px;height:30px}
.bb-overview .bb-time{position:relative;justify-content:flex-start;column-gap:20px;padding:9px 20px 10px;margin:0 0 16px;border-radius:12px;background:linear-gradient(100deg,#c6e8ff,#bfe1fb)}
.bb-overview .bb-time strong{font-size:clamp(18px,4.2vw,27px);font-weight:900;letter-spacing:-.5px;-webkit-text-stroke:.2px currentColor}
.bb-overview .bb-time strong b{font-family:Arial,Helvetica,sans-serif;font-size:clamp(29px,6.3vw,40px);font-weight:900;color:#ff7108;-webkit-text-stroke:.35px currentColor;letter-spacing:-1px}
.bb-overview .bb-time>span{padding-left:20px;border-left:2px solid #204f7b;font-size:clamp(16px,3.7vw,24px);font-weight:900;color:#0b2e56;letter-spacing:-.3px}
.bb-clock-progress{height:10px;padding:2px;margin-top:0}
.bb-overview .bb-category-grid{gap:12px}
.bb-overview .bb-category{grid-template-columns:54px minmax(0,1fr) auto;gap:7px 13px;padding:10px 13px;border-radius:14px;box-shadow:none;background:#fff}
.bb-overview .bb-category-icon{grid-row:1/4;border-right:2px solid #81b7f2;padding-right:10px;color:#08274f}
.bb-category-icon svg{width:43px;height:49px;stroke-width:1.8}
.bb-overview .bb-category header{gap:10px}
.bb-overview .bb-category h3{font-size:clamp(18px,4.35vw,28px);font-weight:900;letter-spacing:-.7px;color:#09234b;-webkit-text-stroke:.18px currentColor}
.bb-overview .bb-cadence-tag{font-size:clamp(12px,3.1vw,19px);font-weight:800;color:#2d5b90;background:#deecfb;padding:2px 8px;border-radius:6px;line-height:1.25}
.bb-overview .bb-main-rate{font-family:Arial,Helvetica,sans-serif;font-size:clamp(32px,7.15vw,44px);font-weight:900;letter-spacing:-1.1px;-webkit-text-stroke:.4px currentColor}
.bb-overview .bb-category>.bb-progress{height:9px;margin:0;background:#d1dce9}
.bb-overview .bb-category>.bb-progress b{display:none}
.bb-overview .bb-category>.bb-row-stats{font-size:clamp(13px,3.1vw,19px);font-weight:700;gap:9px}
.bb-overview .bb-row-stats>span{padding:1px 4px;gap:3px;border-radius:7px;background:#e1edfc;line-height:1.45}
.bb-overview .bb-row-stats b{font-family:Arial,"Microsoft YaHei",sans-serif;font-size:1.05em;font-weight:800}
.bb-overview .bb-row-stats>.bb-stat-zero{background:#ffe8ec;color:#e42b3b}.bb-overview .bb-row-stats>.bb-stat-low{background:#fff0d9;color:#ed7406}
@media(max-width:430px){
 .bb-brand-header{gap:13px;padding:12px 15px;min-height:59px;border-radius:17px 17px 0 0}.bb-mobile-brand{gap:5px;padding-right:12px}.bb-mobile-brand svg{width:27px;height:29px}.bb-mobile-brand b{font-size:13px;letter-spacing:0}.bb-mobile-brand small{font-size:8px}
 .bb-info-row{font-size:10px;padding:7px 9px;gap:5px}.bb-info-row nav{gap:4px}.bb-info-row svg{width:11px;height:11px}.bb-info-row em{font-size:9px;padding:2px 4px}
 .bb-overview .bb-filters{gap:7px;margin:0 2px 12px}.bb-overview .bb-filters select{height:31px;padding:0 5px}.bb-overview .bb-refresh{flex-basis:27px;width:27px;height:31px}.bb-overview .bb-refresh svg{width:26px;height:26px}
 .bb-overview .bb-dispatch-note>span{padding-left:9px;margin-left:7px}
 .bb-overview .bb-time{gap:7px 10px;padding:8px 12px 9px;margin-bottom:13px}.bb-overview .bb-time>span{padding-left:10px}.bb-clock-progress{height:8px}
 .bb-overview .bb-category{grid-template-columns:35px minmax(0,1fr) auto;gap:6px 8px;padding:10px 10px;border-radius:12px}
 .bb-overview .bb-category-icon{grid-row:1/4;padding-right:7px}.bb-category-icon svg{width:27px;height:35px}
 .bb-overview .bb-category header{gap:6px}.bb-overview .bb-category h3{font-size:18px;letter-spacing:-.8px}
 .bb-overview .bb-cadence-tag{font-size:12px;padding:2px 5px}
 .bb-overview .bb-main-rate{font-size:32px}.bb-overview .bb-category>.bb-progress{height:7px}
 .bb-overview .bb-category>.bb-row-stats{grid-column:2/4;font-size:12px;gap:5px}.bb-overview .bb-row-stats>span{padding:2px 2px;gap:2px}
}
@media(max-width:360px){
 .bb-brand-header{gap:10px}.bb-brand-header h2{font-size:22px}.bb-mobile-brand{padding-right:9px}.bb-mobile-brand svg{width:24px}.bb-mobile-brand b{font-size:12px}
 .bb-info-row{font-size:10px;justify-content:flex-start;column-gap:8px}.bb-info-row em{margin-left:auto}
 .bb-overview .bb-dispatch-note>span{font-size:11px;padding-left:6px;margin-left:5px}.bb-dispatch-title{font-size:18px}
 .bb-overview .bb-filters label{font-size:12px}.bb-overview .bb-filters select{font-size:12px;padding:0 3px}.bb-overview .bb-filters{gap:5px}
 .bb-overview .bb-time{padding:7px 10px 8px;column-gap:8px}.bb-overview .bb-time strong{font-size:17px}.bb-overview .bb-time strong b{font-size:28px}.bb-overview .bb-time>span{font-size:14px;padding-left:8px}
 .bb-overview .bb-category{grid-template-columns:28px minmax(0,1fr) auto;gap:6px;padding:9px 8px}.bb-overview .bb-category-icon{padding-right:5px}.bb-category-icon svg{width:22px;height:29px}
 .bb-overview .bb-category h3{font-size:15px;letter-spacing:-.7px}.bb-overview .bb-cadence-tag{font-size:10px;padding:2px 3px}.bb-overview .bb-category header{gap:4px}.bb-overview .bb-main-rate{font-size:29px}
 .bb-overview .bb-category>.bb-row-stats{font-size:10px;gap:4px}.bb-overview .bb-row-stats>span{gap:1px;padding:2px 1px}
}
.bb-overview .bb-time{line-height:1.08;row-gap:6px;padding-top:8px;padding-bottom:8px}
.bb-overview .bb-time strong,.bb-overview .bb-time strong b,.bb-overview .bb-time>span{line-height:1.08}
.bb-overview .bb-category-icon{border-right:0}
.bb-overview .bb-category-icon::after{content:'';position:absolute;right:0;top:50%;height:61px;width:2px;transform:translateY(-50%);border-radius:2px;background:#81b7f2}
.bb-overview .bb-main-rate{font-style:normal}
@media(min-width:431px){.bb-info-row{font-size:15px}.bb-overview .bb-category{padding-top:8px;padding-bottom:8px}}
@media(max-width:430px){.bb-overview .bb-category-icon::after{height:47px}}
.bb-overview .bb-info-row{padding-top:14px;padding-bottom:14px}
.bb-overview .bb-info-row nav{font-size:clamp(18px,4.35vw,28px);font-weight:900;letter-spacing:-.7px;-webkit-text-stroke:.18px currentColor}
.bb-overview .bb-info-row nav strong{font-weight:900}
@media(max-width:430px){.bb-overview .bb-info-row nav{font-size:18px;letter-spacing:-.8px}}
@media(max-width:360px){.bb-overview .bb-info-row nav{font-size:15px;letter-spacing:-.7px}}
.bb-overview{background:transparent}
.bb-overview .bb-category>.bb-row-stats{grid-template-columns:1.25fr 1.8fr 1fr 1fr}
@media(max-width:360px){.bb-overview .bb-category>.bb-row-stats{grid-column:1/4}}
/* Person/channel detail card approved in the visual preview. */
.bb-person{margin:0 0 15px;padding:17px 16px 16px;border:1px solid #c9dfff;border-radius:14px;background:linear-gradient(125deg,#fff 70%,#f5faff);box-shadow:0 4px 10px #2e6cb009}
.bb-person.bb-person-low{border-left:3px solid #ff922c}.bb-person.bb-person-zero{border-left:3px solid #e85667}
.bb-person header{gap:10px;align-items:center}
.bb-person-title{display:flex;align-items:center;gap:11px;min-width:0}
.bb-person-avatar{display:flex;align-items:center;justify-content:center;flex:0 0 40px;width:40px;height:40px;border-radius:50%;background:linear-gradient(130deg,#e8f4ff,#dcecff);color:#0877fb}
.bb-detail-icon{display:inline-block;flex:0 0 20px;width:20px;height:20px;background:currentColor;mask:var(--bb-detail-icon) center / contain no-repeat;-webkit-mask:var(--bb-detail-icon) center / contain no-repeat}
.bb-person-avatar .bb-detail-icon{width:28px;height:28px;flex-basis:28px}
.bb-person .bb-person-title h3{display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:clamp(21px,4.4vw,28px);font-weight:800;line-height:1.35;letter-spacing:-.5px;color:#0e2d59;margin:0}
.bb-person .bb-tier-tag{font-size:15px;padding:3px 9px;border-radius:6px;letter-spacing:0;line-height:1.3}
.bb-person header>.bb-person-status{padding:5px 13px;border-radius:30px;background:#eef4fc;font-size:17px;line-height:1.3;text-align:center;font-weight:800;max-width:40%;overflow-wrap:anywhere}
.bb-person header>.bb-person-status.bb-tone-behind{background:#fff0de;color:#dd741c}
.bb-person header>.bb-person-status.bb-zero{background:#ffe9ed;color:#d93649}
.bb-person header>.bb-person-status.bb-tone-reached{background:#e2f6ef;color:#079e8c}
.bb-person-job{display:flex;align-items:center;flex-wrap:wrap;gap:7px 12px;margin:10px 0 11px;color:#425f85;font-size:14px;line-height:1.6}
.bb-person-job>span:first-child{padding:2px 9px;background:#e4efff;border-radius:5px;color:#204e84;font-weight:700}
.bb-person-job>span+span{padding-left:12px;border-left:1px solid #b7cbe6;min-width:0;overflow-wrap:anywhere}
.bb-person .bb-person-line{display:flex;align-items:flex-start;gap:8px;margin:6px 0;color:#47668a;font-size:15px;line-height:1.6}
.bb-person-line>.bb-detail-icon{color:#0877de;margin-top:2px}.bb-person-line>span{min-width:0;overflow-wrap:anywhere}
.bb-person .bb-person-shop{margin-bottom:13px;color:#243f68}
.bb-person .bb-person-values{grid-template-columns:repeat(3,minmax(0,1fr));gap:0;padding:13px 7px;margin-top:13px;border:0;border-radius:12px;background:linear-gradient(100deg,#edf5ff,#e5f0ff)}
.bb-person-values>span{padding:0 5px;text-align:center;font-size:15px;color:#47678c;font-weight:600;line-height:1.5}
.bb-person-values>span+span{border-left:1px solid #bfd4ee}
.bb-person .bb-person-values b{margin-top:6px;color:#132e59;font-family:Arial,"Microsoft YaHei",sans-serif;font-size:clamp(25px,5.7vw,35px);line-height:1.1;white-space:nowrap;font-weight:800}
.bb-person .bb-person-values>span:first-child b{color:#0877fb}
.bb-person .bb-person-values b.bb-gap-value{color:#f1871a}
.bb-person-values b small{font-family:"Microsoft YaHei","PingFang SC",sans-serif;font-size:.66em;font-weight:700}
.bb-person .bb-person-footer{margin-top:12px;color:#354f72;font-size:15px;line-height:1.5}
.bb-person-footer>div:first-child{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:5px 12px}
.bb-person-footer b{font-weight:700}.bb-person-footer>div:first-child>span:last-child b{color:#0877fb;font-family:Arial,sans-serif;font-size:19px;font-weight:800}
.bb-person-progress{margin-top:9px;height:8px;overflow:hidden;border-radius:20px;background:#d3e3f7}
.bb-person-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#168dff,#0068f5)}
@media(max-width:430px){
 .bb-person{padding:15px 13px 14px;border-radius:12px}.bb-person-title{gap:8px}.bb-person-avatar{width:34px;height:34px;flex-basis:34px}.bb-person-avatar .bb-detail-icon{width:24px;height:24px;flex-basis:24px}
 .bb-person .bb-person-title h3{font-size:21px;gap:6px}.bb-person .bb-tier-tag{font-size:13px;padding:3px 7px}.bb-person header>.bb-person-status{font-size:15px;padding:5px 11px}
 .bb-person-job{font-size:12px;gap:6px 9px;margin-top:9px}.bb-person-job>span+span{padding-left:9px}
 .bb-person .bb-person-line{font-size:14px;gap:6px}.bb-person-line>.bb-detail-icon{width:18px;height:18px;flex-basis:18px}
 .bb-person .bb-person-values{padding:12px 4px}.bb-person-values>span{font-size:13px;padding:0 3px}.bb-person .bb-person-values b{font-size:28px}
 .bb-person .bb-person-footer{font-size:13px}.bb-person-footer>div:first-child>span:last-child b{font-size:17px}
}
@media(max-width:360px){
 .bb-person{padding:13px 10px}.bb-person .bb-person-title h3{font-size:19px}.bb-person header>.bb-person-status{font-size:13px;padding:5px 9px}.bb-person .bb-person-line{font-size:13px}
 .bb-person-values>span{font-size:12px}.bb-person .bb-person-values b{font-size:24px}
}

/* Use App's shared breadcrumbs, matching overview and capacity search. */
.bb-overview .bb-info-row{margin:0 0 14px;padding:0;min-height:28px;background:transparent;gap:8px 14px;justify-content:space-between;color:#607998;font-size:13px;font-weight:500}
.bb-overview .bb-info-scope{padding:0;border:0;background:transparent;color:#607998;font-size:inherit;font-weight:500}
.bb-overview .bb-info-date{font:inherit;color:inherit;white-space:nowrap}
.bb-overview .bb-info-row svg{width:16px;height:16px}
.bb-region-row .bb-region-meta{grid-column:2/-1;display:flex;flex-wrap:wrap;align-items:center;gap:5px 16px;min-width:0;margin:0;font-size:12px;line-height:1.65;color:#718bad;text-align:left}
.bb-region-meta>span{white-space:nowrap}

.bb-ranking-analysis{margin:-4px 0 12px;padding:13px 14px;border:1px solid #d5e6fb;border-radius:10px;background:linear-gradient(120deg,#f8fbff,#edf5ff);color:#294d75;font-size:14px;line-height:1.8}
.bb-ranking-analysis>header{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:4px 12px;margin-bottom:5px}
.bb-ranking-analysis h3{margin:0;color:#163964;font-size:17px;font-weight:800}.bb-ranking-analysis>header>span{color:#718bad;font-size:12px}
.bb-ranking-row{display:grid;grid-template-columns:76px minmax(0,1fr);gap:10px;padding:9px 0;border-top:1px solid #dce9f8;align-items:start}
.bb-ranking-row>strong{font-weight:800;color:#254d7b}.bb-ranking-row p{margin:0;overflow-wrap:anywhere}.bb-ranking-copy p+p{margin-top:4px}
.bb-ranking-good,.bb-ranking-bad{display:inline-block;margin-right:8px;padding:0 6px;border-radius:4px;font-size:12px;font-weight:700;white-space:nowrap}
.bb-ranking-good{color:#079b82;background:#dff5ee}.bb-ranking-bad{color:#d97715;background:#fff0df}.bb-ranking-copy>small{display:block;color:#8293aa;font-size:12px}
.bb-ranking-analysis>footer{padding-top:8px;border-top:1px solid #dce9f8;color:#71839b;font-size:12px;line-height:1.7}
@media(max-width:360px){.bb-ranking-analysis{padding:11px 10px;font-size:13px}.bb-ranking-row{grid-template-columns:65px minmax(0,1fr);gap:6px}}

/* Retain enough height to keep the detail filters in place, including empty results. */
.bb-detail-results{min-height:100vh;scroll-margin-top:14px}
.bb-person.bb-business-card .bb-person-title h3{font-size:clamp(18px,3.6vw,22px);line-height:1.45;letter-spacing:0}
@media(max-width:360px){.bb-person.bb-business-card .bb-person-title h3{font-size:17px}}
</style>
