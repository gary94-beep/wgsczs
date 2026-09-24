<template>
  <div class="app-shell">
    <main v-if="page === 'login'" class="login-page">
      <section class="brand-panel"><h1>网格生产<span>AI</span>助手</h1><p>产能盯控 · 低产能人员筛选</p></section>
      <section class="login-card">
        <h2>欢迎登录</h2>
        <label class="login-field"><span>手机号</span><input v-model.trim="loginPhone" type="tel" maxlength="11" placeholder="请输入手机号" /></label>
        <label class="login-field"><span>验证码</span><div class="code-row"><input v-model.trim="loginCode" type="tel" maxlength="6" placeholder="请输入验证码" /><button type="button" @click="sendCode">获取</button></div></label>
        <button class="primary-login" type="button" :disabled="loading" @click="handleLogin">登录</button>
        <button v-if="isMock" class="quick-login" type="button" :disabled="loading" @click="oneClickLogin">本机号码一键登录</button>
        <label class="login-agreement"><input v-model="agreedToTerms" type="checkbox" aria-label="同意登录服务条款和隐私协议" /><span>登录即同意 <span class="agreement-link">《中国移动号码服务条款》</span><span class="agreement-link">《中国移动广东公司电子渠道登录服务协议》</span>和<span class="agreement-link">《隐私协议》</span></span></label>
        <div v-if="isMock" class="demo-accounts"><span>演示身份</span><button type="button" @click="loginPhone = '13800000000'">市公司</button><button type="button" @click="loginPhone = '13800000001'">分公司</button><button type="button" @click="loginPhone = '13800000003'">网格长</button></div>
      </section>
    </main>

    <main v-else class="dashboard-page">
      <header v-if="stage === 'workbench'" class="top-bar">
        <div><h1>网格生产<span>AI</span>助手</h1><p>{{ scopeName }} · {{ roleLabel }} <em v-if="isMock">演示数据</em></p></div>
        <button type="button" title="刷新数据" aria-label="刷新数据" @click="refreshDashboard"><span class="toolbar-icon" aria-hidden="true"></span></button>
      </header>

      <nav v-if="stage !== 'workbench'" class="breadcrumbs" aria-label="当前位置">
        <button type="button" @click="goWorkbench">工作台</button><span>›</span>
        <template v-if="stage === 'monitor'"><strong>低产预警监控</strong></template>
        <template v-else-if="stage === 'campus'"><strong>校园生产管理</strong></template>
        <template v-else>
          <strong v-if="stage === 'overview'">生产总览</strong>
          <button v-else type="button" @click="goOverview">生产总览</button>
          <template v-if="stage === 'branches' || stage === 'grids' || stage === 'alerts'"><span>›</span><strong v-if="stage === 'branches' || (stage === 'alerts' && user.role === 'grid')">{{ selectedProduct?.productName }}</strong><button v-else type="button" @click="goProduct">{{ selectedProduct?.productName }}</button></template>
          <template v-if="user.role === 'city' && (stage === 'grids' || stage === 'alerts')"><span>›</span><strong v-if="stage === 'grids'">{{ selectedBranch?.branchName }}</strong><button v-else type="button" @click="goBranch">{{ selectedBranch?.branchName }}</button></template>
          <template v-if="stage === 'alerts'"><span>›</span><strong>{{ selectedGrid?.gridName }}</strong></template>
        </template>
      </nav>

      <template v-if="stage === 'workbench'">
        <section class="workbench-heading"><h2>工作台</h2></section>
        <section class="workbench-menu" aria-label="工作台菜单">
          <button type="button" @click="goOverview"><span class="menu-icon menu-icon-blue"><i class="menu-glyph menu-glyph-overview" aria-hidden="true"></i></span><span class="menu-copy"><strong>生产总览</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
          <button type="button" @click="openMonitor"><span class="menu-icon menu-icon-green"><i class="menu-glyph menu-glyph-alert" aria-hidden="true"></i></span><span class="menu-copy"><strong>低产预警监控</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
          <button type="button" @click="openCampus"><span class="menu-icon menu-icon-blue"><i class="menu-glyph menu-glyph-campus" aria-hidden="true"></i></span><span class="menu-copy"><strong>校园生产管理</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
        </section>
      </template>

      <template v-else-if="stage === 'overview'">
        <section class="overview-heading"><div><h2>生产总览</h2><span>{{ scopeName }} · {{ overviewLabel }}</span></div></section>
        <div class="source-strip"><span>产能：系统取数</span><span>目标：市公司导入</span></div>
        <section class="product-section"><div class="section-head"><h2>产能与目标</h2><span>{{ user.role === 'grid' ? '点击查看预警' : '点击指标查看下级' }}</span></div>
          <button v-for="(item, index) in overview" :key="item.productId" class="product-row" :class="{ 'product-row-green': index % 2 === 1 }" type="button" @click="openProduct(item.productId)">
            <div class="product-row-top"><span class="product-icon" :style="{ '--product-icon': `url(/icons/${productIcon(item.productId)}.svg)` }" aria-hidden="true"></span><strong>{{ item.productName }}</strong><b>{{ rateLabel(item) }}</b><i class="product-chevron" aria-hidden="true"></i></div>
            <div class="product-numbers"><strong>{{ displayNumber(item.production) }}</strong><small>{{ item.unit }}</small><span>目标 {{ displayNumber(item.target) }} {{ item.unit }}</span><span class="product-gap">{{ gapLabel(item) }}</span></div>
            <div class="product-progress" role="progressbar" :aria-label="`${item.productName}目标完成率`" :aria-valuenow="Math.min(100, item.completionRate || 0)" aria-valuemin="0" aria-valuemax="100"><i :style="{ width: progressWidth(item) }"></i></div>
          </button>
        </section>
        <section v-if="user.role === 'city'" class="target-management"><div class="target-heading"><span class="target-icon" aria-hidden="true"></span><div><h2>目标值管理</h2><p>按网格、产品导入目标，自动汇总分公司和全市目标</p></div></div><div class="target-actions"><button type="button" @click="downloadTargetTemplate"><span class="action-icon download-icon" aria-hidden="true"></span>下载模板</button><button type="button" class="target-import" @click="targetFileInput?.click()"><span class="action-icon upload-icon" aria-hidden="true"></span>导入目标表</button></div><input ref="targetFileInput" type="file" accept=".csv,text/csv" hidden @change="handleTargetFile" /></section>
      </template>

      <template v-else-if="stage === 'branches'">
        <header class="drill-page-title"><h2>{{ selectedProduct?.productName }}产能</h2><p>全市 · 分公司</p></header>
        <section class="drill-heading"><div class="drill-total-top"><span class="drill-product-icon" :style="{ '--product-icon': `url(/icons/${productIcon(selectedProductId)}.svg)` }" aria-hidden="true"></span><div><h3>全市{{ selectedProduct?.productName }}</h3><div class="drill-total-values"><strong>{{ displayNumber(cityMetric.production) }} <small>{{ selectedProduct?.unit }}</small></strong><span>目标 {{ displayNumber(cityMetric.target) }} {{ selectedProduct?.unit }}</span></div></div><b>{{ rateLabel(cityMetric) }}</b></div><div class="product-progress"><i :style="{ width: progressWidth(cityMetric) }"></i></div></section>
        <section class="drill-list"><div class="section-head"><h2>分公司产能</h2><span>{{ branchMetrics.length }} 个</span></div><button v-for="item in branchMetrics" :key="item.branchId" class="drill-row" type="button" @click="openBranch(item.branchId)"><div class="drill-row-top"><span class="drill-org-icon" aria-hidden="true"></span><strong>{{ item.branchName }}</strong><i class="product-chevron" aria-hidden="true"></i></div><div class="drill-row-values"><div><span>产能</span><b>{{ displayNumber(item.production) }} <small>{{ selectedProduct?.unit }}</small></b></div><div><span>目标</span><strong>{{ displayNumber(item.target) }} <small>{{ selectedProduct?.unit }}</small></strong></div><div><span>完成</span><strong class="drill-rate">{{ rateLabel(item) }}</strong></div><div><span>差额</span><strong>{{ item.hasTarget ? displayNumber(item.gap) : '—' }} <small v-if="item.hasTarget">{{ selectedProduct?.unit }}</small></strong></div></div><div class="product-progress"><i :style="{ width: progressWidth(item) }"></i></div></button></section>
      </template>

      <template v-else-if="stage === 'grids'">
        <header class="drill-page-title"><h2>{{ selectedProduct?.productName }}产能</h2><p>{{ selectedBranch?.branchName }} · 网格</p></header>
        <section class="drill-heading"><div class="drill-total-top"><span class="drill-product-icon" :style="{ '--product-icon': `url(/icons/${productIcon(selectedProductId)}.svg)` }" aria-hidden="true"></span><div><h3>{{ selectedBranch?.branchName }}{{ selectedProduct?.productName }}</h3><div class="drill-total-values"><strong>{{ displayNumber(branchMetric.production) }} <small>{{ selectedProduct?.unit }}</small></strong><span>目标 {{ displayNumber(branchMetric.target) }} {{ selectedProduct?.unit }}</span></div></div><b>{{ rateLabel(branchMetric) }}</b></div><div class="product-progress"><i :style="{ width: progressWidth(branchMetric) }"></i></div></section>
        <section class="drill-list"><div class="section-head"><h2>网格产能</h2><span>{{ gridMetrics.length }} 个</span></div><button v-for="item in gridMetrics" :key="item.gridId" class="drill-row" type="button" @click="openGrid(item.gridId)"><div class="drill-row-top"><span class="drill-org-icon" aria-hidden="true"></span><strong>{{ item.gridName }}</strong><i class="product-chevron" aria-hidden="true"></i></div><div class="drill-row-values"><div><span>产能</span><b>{{ displayNumber(item.production) }} <small>{{ selectedProduct?.unit }}</small></b></div><div><span>目标</span><strong>{{ displayNumber(item.target) }} <small>{{ selectedProduct?.unit }}</small></strong></div><div><span>完成</span><strong class="drill-rate">{{ rateLabel(item) }}</strong></div><div><span>差额</span><strong>{{ item.hasTarget ? displayNumber(item.gap) : '—' }} <small v-if="item.hasTarget">{{ selectedProduct?.unit }}</small></strong></div></div><div class="product-progress"><i :style="{ width: progressWidth(item) }"></i></div></button></section>
      </template>

      <template v-else-if="stage === 'monitor' || stage === 'alerts'">
        <section class="alert-heading"><h2>{{ stage === 'monitor' ? '低产预警监控' : '低产预警' }}</h2><span>{{ stage === 'monitor' ? monitorScopeLabel : selectedGrid?.gridName }} · {{ roleLabel }}</span></section>
        <section class="filter-card">
          <div class="monitor-filters">
            <label v-if="stage === 'monitor' && user.role === 'city'" class="monitor-filter">分公司<select v-model="monitorBranchId" @change="onMonitorBranchChange"><option value="">全部分公司</option><option v-for="branch in dashboard.organization.branches" :key="branch.branchId" :value="branch.branchId">{{ branch.branchName }}</option></select></label>
            <label v-if="stage === 'monitor'" class="monitor-filter">网格<select v-model="monitorGridId" :disabled="user.role === 'grid'" @change="selectedChannel = ''"><option v-if="user.role !== 'grid'" value="">全部网格</option><option v-for="grid in monitorGrids" :key="grid.gridId" :value="grid.gridId">{{ grid.gridName }}</option></select></label>
            <div v-else class="monitor-readonly"><span>所在网格</span><strong>{{ selectedGrid?.gridName }}</strong></div>
            <label v-if="stage === 'monitor'" class="monitor-filter">产品<select v-model="monitorProductId" @change="onMonitorProductChange"><option v-for="product in dashboard.products" :key="product.productId" :value="product.productId">{{ product.productName }}</option></select></label>
            <div v-else class="monitor-readonly"><span>产品</span><strong>{{ selectedProduct?.productName }}</strong></div>
            <div class="threshold-control"><span>低产阈值</span><div><button type="button" aria-label="降低阈值" @click="adjustThreshold(-1)">−</button><input v-model.number="threshold" type="number" min="0" :step="thresholdStep" aria-label="低产阈值" /><button type="button" aria-label="提高阈值" @click="adjustThreshold(1)">+</button></div></div>
            <div class="period-field"><span>统计周期</span><strong>本月</strong></div>
          </div>
          <label v-if="stage === 'alerts'" class="channel-filter">渠道<select v-model="selectedChannel"><option value="">全部渠道</option><option v-for="channel in channelOptions" :key="channel" :value="channel">{{ channel }}</option></select></label>
          <div class="filter-footer"><small>{{ tab === 'channel' ? '渠道合计' : '人员' }}产能 ≤ {{ cleanThreshold }} {{ activeProduct?.unit }}，0 为零产</small><button type="button" @click="applyFilters">筛选</button></div>
        </section>
        <div class="alert-summary"><div><span>零产人员</span><strong>{{ zeroPeopleCount }}</strong></div><div><span>低产人员</span><strong>{{ lowPeople.length }}</strong></div><div><span>低产渠道</span><strong>{{ lowChannels.length }}</strong></div></div>
        <div class="tabs"><button type="button" :class="{ active: tab === 'people' }" @click="tab = 'people'">人员</button><button type="button" :class="{ active: tab === 'channel' }" @click="tab = 'channel'">渠道</button></div>
        <section v-if="tab === 'people'" class="list-section"><div class="section-head"><h2>待关注人员</h2><span>{{ lowPeople.length }} 人</span></div><article v-for="item in lowPeople" :key="`${item.gridId}-${item.staffId}`" class="person-card" :class="{ zero: item.production === 0 }"><span class="person-avatar" aria-hidden="true"></span><div class="person-main"><strong>{{ item.staffName }}</strong><span>{{ stage === 'monitor' ? `${gridName(item.gridId)} · ` : '' }}{{ item.team }} · {{ item.channel }}</span></div><div class="person-score"><strong>{{ displayNumber(item.production) }}</strong><span>{{ activeProduct?.unit }}</span></div><p>{{ item.production === 0 ? '零产' : '低产' }}</p></article><p v-if="!lowPeople.length" class="empty-state">当前条件下暂无低产人员</p></section>
        <section v-else class="list-section"><div class="section-head"><h2>零产 / 低产渠道</h2><span>{{ lowChannels.length }} 个</span></div><article v-for="item in lowChannels" :key="`${item.gridId}-${item.channel}`" class="channel-card"><div class="channel-head"><strong>{{ item.channel }}</strong><span>{{ item.production === 0 ? '零产' : '低产' }}</span></div><div class="channel-meta"><span>{{ gridName(item.gridId) }} · {{ displayNumber(item.production) }} {{ activeProduct?.unit }}</span><span>{{ item.staffCount }} 人</span></div></article><p v-if="!lowChannels.length" class="empty-state">当前条件下暂无低产渠道</p></section>
      </template>

      <template v-else-if="stage === 'campus'">
        <section class="campus-placeholder"><span>校园生产管理</span><h2>校园生产通</h2><p>入口待配置</p></section>
      </template>
      <nav v-if="stage !== 'workbench'" class="bottom-nav" aria-label="主导航"><button type="button" :class="{ active: stage === 'campus' }" @click="goWorkbench"><i class="bottom-icon bottom-home" aria-hidden="true"></i><span>工作台</span></button><button type="button" :class="{ active: ['overview', 'branches', 'grids'].includes(stage) }" @click="goOverview"><i class="bottom-icon bottom-overview" aria-hidden="true"></i><span>生产总览</span></button><button type="button" :class="{ active: ['monitor', 'alerts'].includes(stage) }" @click="openMonitor"><i class="bottom-icon bottom-alert" aria-hidden="true"></i><span>预警监控</span></button></nav>
    </main>

    <main v-if="loading" class="loading-mask"><span class="loading-spinner"></span><span>加载中...</span></main>
    <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { isMock } from './api/client'
import { fetchDashboard, fetchPermission, importTargets } from './api/production'

const page = ref('login')
const stage = ref('workbench')
const loading = ref(false)
const token = ref('')
const loginPhone = ref('')
const loginCode = ref('')
const agreedToTerms = ref(false)
const user = reactive({ name: '', phone: '', role: '', branchId: '', branchName: '', gridId: '', gridName: '', cityName: '' })
const dashboard = reactive({ organization: { cityName: '', branches: [], grids: [] }, statDate: '', products: [], targets: [], rows: [] })
const selectedProductId = ref('')
const selectedBranchId = ref('')
const selectedGridId = ref('')
const monitorBranchId = ref('')
const monitorGridId = ref('')
const monitorProductId = ref('')
const selectedChannel = ref('')
const threshold = ref(1)
const tab = ref('people')
const targetFileInput = ref(null)
const toast = reactive({ show: false, type: 'success', message: '' })

const scopeName = computed(() => user.role === 'city' ? dashboard.organization.cityName : user.role === 'grid' ? user.gridName : user.branchName)
const roleLabel = computed(() => ({ city: '市公司', branch: '分公司', grid: '网格长' })[user.role] || '')
const overviewLabel = computed(() => ({ city: '全市生产总览', branch: '分公司生产总览', grid: '网格生产总览' })[user.role] || '生产总览')
const selectedProduct = computed(() => dashboard.products.find(item => item.productId === selectedProductId.value))
const activeProduct = computed(() => dashboard.products.find(item => item.productId === (stage.value === 'monitor' ? monitorProductId.value : selectedProductId.value)))
const selectedBranch = computed(() => dashboard.organization.branches.find(item => item.branchId === selectedBranchId.value))
const selectedGrid = computed(() => dashboard.organization.grids.find(item => item.gridId === selectedGridId.value))
const thresholdStep = computed(() => activeProduct.value?.productId === 'revenue' ? 0.1 : 1)
const cleanThreshold = computed(() => {
  const value = Math.max(0, Number(threshold.value) || 0)
  return Math.round(Math.floor(value / thresholdStep.value + 1e-9) * thresholdStep.value * 10) / 10
})

function metric(productId, gridIds) {
  const ids = new Set(gridIds)
  const relevantTargets = dashboard.targets.filter(item => item.productId === productId && ids.has(item.gridId))
  const target = relevantTargets.reduce((sum, item) => sum + Number(item.target || 0), 0)
  const production = dashboard.rows.filter(item => item.productId === productId && ids.has(item.gridId)).reduce((sum, item) => sum + Number(item.production || 0), 0)
  const hasTarget = relevantTargets.length === ids.size && ids.size > 0
  return { production, target, hasTarget, gap: hasTarget ? Math.max(0, target - production) : null, completionRate: hasTarget && target > 0 ? Math.round(production / target * 100) : null }
}

function gridsOf(branchId) { return dashboard.organization.grids.filter(item => item.branchId === branchId).map(item => item.gridId) }
const scopeGridIds = computed(() => user.role === 'city' ? dashboard.organization.grids.map(item => item.gridId) : user.role === 'grid' ? [user.gridId] : gridsOf(user.branchId))
const overview = computed(() => dashboard.products.map(item => ({ ...item, ...metric(item.productId, scopeGridIds.value) })))
const cityMetric = computed(() => metric(selectedProductId.value, scopeGridIds.value))
const branchMetric = computed(() => metric(selectedProductId.value, gridsOf(selectedBranchId.value)))
const branchMetrics = computed(() => dashboard.organization.branches.map(item => ({ ...item, ...metric(selectedProductId.value, gridsOf(item.branchId)) })))
const gridMetrics = computed(() => dashboard.organization.grids.filter(item => item.branchId === selectedBranchId.value).map(item => ({ ...item, ...metric(selectedProductId.value, [item.gridId]) })))
const monitorGrids = computed(() => dashboard.organization.grids.filter(item => !monitorBranchId.value || item.branchId === monitorBranchId.value))
const monitorGridIds = computed(() => monitorGridId.value ? [monitorGridId.value] : monitorGrids.value.map(item => item.gridId))
const monitorScopeLabel = computed(() => monitorGridId.value ? gridName(monitorGridId.value) : monitorBranchId.value ? dashboard.organization.branches.find(item => item.branchId === monitorBranchId.value)?.branchName : scopeName.value)
const alertRows = computed(() => {
  const ids = new Set(stage.value === 'monitor' ? monitorGridIds.value : [selectedGridId.value])
  return dashboard.rows.filter(item => ids.has(item.gridId) && item.productId === activeProduct.value?.productId)
})
const channelOptions = computed(() => [...new Set(alertRows.value.map(item => item.channel || '未归类'))].sort((a, b) => a.localeCompare(b, 'zh-CN')))
const filteredAlertRows = computed(() => alertRows.value.filter(item => !selectedChannel.value || item.channel === selectedChannel.value))
const lowPeople = computed(() => filteredAlertRows.value.filter(item => Number(item.production) <= cleanThreshold.value).sort((a, b) => a.production - b.production))
const zeroPeopleCount = computed(() => lowPeople.value.filter(item => Number(item.production) === 0).length)
const lowChannels = computed(() => {
  const map = new Map()
  filteredAlertRows.value.forEach(item => {
    const name = item.channel || '未归类'
    const key = `${item.gridId}|${name}`
    const value = map.get(key) || { gridId: item.gridId, channel: name, production: 0, staffCount: 0 }
    value.production += Number(item.production || 0)
    value.staffCount++
    map.set(key, value)
  })
  return [...map.values()].filter(item => item.production <= cleanThreshold.value).sort((a, b) => a.production - b.production)
})

function displayNumber(value) { return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) }
function productIcon(id) { return ({ revenue: 'wallet', newNumbers: 'contact', plan119: 'gift', terminal: 'smartphone', homeBroadband: 'house', gigabit: 'wifi' })[id] || 'chart-no-axes-combined' }
function rateLabel(item) { return item?.completionRate === null || item?.completionRate === undefined ? '未设目标' : `${item.completionRate}%` }
function progressWidth(item) { return `${Math.min(100, Math.max(0, item?.completionRate || 0))}%` }
function gapLabel(item) { return !item.hasTarget ? '待导入目标' : item.gap > 0 ? `距目标还差 ${displayNumber(item.gap)} ${selectedProduct.value?.unit || item.unit || ''}` : '已达成目标' }
function gridName(id) { return dashboard.organization.grids.find(item => item.gridId === id)?.gridName || '' }
function scrollTop() { window.scrollTo(0, 0) }
function goWorkbench() { stage.value = 'workbench'; scrollTop() }
function goOverview() { stage.value = 'overview'; selectedProductId.value = ''; selectedBranchId.value = ''; selectedGridId.value = ''; scrollTop() }
function goProduct() { stage.value = user.role === 'city' ? 'branches' : user.role === 'branch' ? 'grids' : 'overview'; selectedBranchId.value = user.role === 'city' ? '' : user.branchId; selectedGridId.value = ''; scrollTop() }
function goBranch() { stage.value = 'grids'; selectedGridId.value = ''; scrollTop() }
function openProduct(id) { selectedProductId.value = id; selectedBranchId.value = user.role === 'city' ? '' : user.branchId; selectedGridId.value = user.role === 'grid' ? user.gridId : ''; selectedChannel.value = ''; threshold.value = 1; tab.value = 'people'; stage.value = user.role === 'city' ? 'branches' : user.role === 'branch' ? 'grids' : 'alerts'; scrollTop() }
function openBranch(id) { selectedBranchId.value = id; stage.value = 'grids'; scrollTop() }
function openGrid(id) { selectedGridId.value = id; selectedChannel.value = ''; threshold.value = 1; tab.value = 'people'; stage.value = 'alerts'; scrollTop() }
function openMonitor() { monitorBranchId.value = user.role === 'city' ? '' : user.branchId; monitorGridId.value = user.role === 'grid' ? user.gridId : ''; monitorProductId.value = dashboard.products[0]?.productId || ''; selectedChannel.value = ''; threshold.value = 1; tab.value = 'people'; stage.value = 'monitor'; scrollTop() }
function openCampus() { stage.value = 'campus'; scrollTop() }
function onMonitorBranchChange() { monitorGridId.value = ''; selectedChannel.value = '' }
function onMonitorProductChange() { threshold.value = 1; selectedChannel.value = ''; tab.value = 'people' }
function adjustThreshold(direction) { threshold.value = Math.round((cleanThreshold.value + direction * thresholdStep.value) * 10) / 10; if (threshold.value < 0) threshold.value = 0 }
function applyFilters() { document.querySelector('.alert-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

onMounted(() => { const params = new URLSearchParams(location.search); token.value = params.get('token') || ''; loginPhone.value = params.get('phone') || params.get('mobile') || '' })

async function handleLogin() {
  if (!agreedToTerms.value) return showToast('请先同意登录协议', 'warning')
  if (!/^1\d{10}$/.test(loginPhone.value)) return showToast('请输入正确的11位手机号', 'warning')
  loading.value = true
  try {
    const permission = await fetchPermission(loginPhone.value, token.value)
    if (!permission || !['city', 'branch', 'grid'].includes(permission.role) || (permission.role !== 'city' && !permission.branchId) || (permission.role === 'grid' && !permission.gridId)) throw new Error('该手机号暂无查看权限')
    Object.assign(user, permission)
    await loadDashboard()
    goWorkbench()
    page.value = 'dashboard'
  } catch (error) { showToast(error.message || '登录失败', 'error') } finally { loading.value = false }
}

async function loadDashboard() {
  const data = await fetchDashboard({ phone: user.phone }, token.value)
  dashboard.organization = data.organization || { cityName: '', branches: [], grids: [] }
  dashboard.statDate = data.statDate || ''
  dashboard.products = data.products || []
  dashboard.targets = data.targets || []
  dashboard.rows = data.rows || []
}

async function refreshDashboard() { loading.value = true; try { await loadDashboard(); showToast('数据已刷新') } catch (error) { showToast(error.message || '刷新失败', 'error') } finally { loading.value = false } }
function sendCode() { if (!/^1\d{10}$/.test(loginPhone.value)) return showToast('请先输入正确的手机号', 'warning'); loginCode.value = '123456'; showToast(isMock ? '模拟验证码：123456' : '验证码已发送') }
function oneClickLogin() { if (!agreedToTerms.value) return showToast('请先同意登录协议', 'warning'); if (isMock) { loginPhone.value = '13800000000'; loginCode.value = '123456' }; handleLogin() }

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = '' }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = '' }
    else cell += char
  }
  if (quoted) throw new Error('CSV 引号未闭合')
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row)
  return rows
}

function downloadTargetTemplate() {
  const lines = ['gridId,productId,target', ...dashboard.organization.grids.flatMap(grid => dashboard.products.map(product => {
    const value = dashboard.targets.find(item => item.gridId === grid.gridId && item.productId === product.productId)?.target ?? ''
    return `${grid.gridId},${product.productId},${value}`
  }))]
  const url = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = '网格产品目标模板.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function handleTargetFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    if (user.role !== 'city') throw new Error('仅市公司账号可导入目标')
    const data = parseCsv((await file.text()).replace(/^\ufeff/, ''))
    if (data[0]?.join(',') !== 'gridId,productId,target') throw new Error('表头必须为 gridId,productId,target')
    const validKeys = new Set(dashboard.organization.grids.flatMap(grid => dashboard.products.map(product => `${grid.gridId}|${product.productId}`)))
    const imported = new Map()
    for (const [index, row] of data.slice(1).entries()) {
      if (row.length !== 3) throw new Error(`第 ${index + 2} 行列数不正确`)
      const [gridId, productId, rawTarget] = row; const key = `${gridId}|${productId}`; const target = Number(rawTarget)
      if (!validKeys.has(key)) throw new Error(`第 ${index + 2} 行网格或产品无效`)
      if (imported.has(key)) throw new Error(`第 ${index + 2} 行目标重复`)
      if (rawTarget === '' || !Number.isFinite(target) || target < 0) throw new Error(`第 ${index + 2} 行目标值无效`)
      imported.set(key, { gridId, productId, target })
    }
    if (imported.size !== validKeys.size) throw new Error(`目标表须包含全部 ${validKeys.size} 条网格产品记录`)
    loading.value = true
    await importTargets([...imported.values()], user, token.value)
    await loadDashboard()
    showToast(`已导入 ${imported.size} 条目标`)
  } catch (error) { showToast(error.message || '导入失败', 'error') } finally { loading.value = false }
}

function showToast(message, type = 'success') { toast.message = message; toast.type = type; toast.show = true; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.show = false }, 3000) }
</script>
