<template>
  <div class="app-shell">
    <main v-if="page === 'login'" class="login-page">
      <section class="brand-panel">
        <h1>网格生产<span>AI</span>助手</h1>
      </section>
      <section class="login-card">
        <h2>欢迎登录</h2>
        <label class="login-field"><span>手机号</span><input v-model.trim="loginPhone" type="tel" maxlength="11"
            placeholder="请输入手机号" /></label>
        <label class="login-field"><span>验证码</span>
          <div class="code-row"><input v-model.trim="loginCode" type="tel" maxlength="6" placeholder="请输入验证码" /><button
              type="button" :disabled="loading || codeSending || codeCountdown > 0" @click="sendCode">{{ codeSending ?
                '发送中' : codeCountdown > 0 ? `${codeCountdown}s` : '获取' }}</button></div>
        </label>
        <button class="primary-login" type="button" :disabled="loading || codeSending" @click="handleLogin">{{ loading ?
          '登录中' : '登录' }}</button>
        <button class="quick-login" type="button" :disabled="loading || codeSending"
          @click="oneClickLogin">本机号码一键登录</button>
        <label class="login-agreement"><input v-model="agreedToTerms" type="checkbox"
            aria-label="同意登录服务条款和隐私协议" /><span>登录即同意 <span class="agreement-link">《中国移动号码服务条款》</span><span
              class="agreement-link">《中国移动广东公司电子渠道登录服务协议》</span>和<span
              class="agreement-link">《隐私协议》</span></span></label>
        <div v-if="isMock" class="demo-accounts"><span>演示身份</span><button type="button"
            @click="loginPhone = '13800000000'">市公司</button><button type="button"
            @click="loginPhone = '13800000001'">分公司</button><button type="button"
            @click="loginPhone = '13800000003'">网格长</button></div>
      </section>
    </main>

    <main v-else class="dashboard-page">
      <header v-if="stage === 'workbench'" class="top-bar">
        <div>
          <h1>网格生产<span>AI</span>助手</h1>
          <p>{{ scopeName }} · {{ roleLabel }} <em v-if="isMock">演示数据</em></p>
        </div>
        <button type="button" title="刷新数据" aria-label="刷新数据" @click="refreshDashboard"><span class="toolbar-icon"
            aria-hidden="true"></span></button>
      </header>

      <nav v-if="stage !== 'workbench'" class="breadcrumbs" aria-label="当前位置">
        <button type="button" @click="goWorkbench">工作台</button><span>›</span>
        <template v-if="stage === 'monitor'"><strong>低产预警监控</strong></template>
        <template v-else-if="stage === 'campus'"><strong>校园生产管理</strong></template>
        <template v-else-if="stage === 'search'"><strong>产能速查</strong></template>
        <template v-else-if="stage === 'imports'"><strong>数据导入</strong></template>
        <template v-else-if="stage === 'scripts'"><button type="button"
            @click="returnFromScripts">低产预警监控</button><span>›</span><strong>经典话术库</strong></template>
        <template v-else>
          <strong v-if="stage === 'overview'">生产总览</strong>
          <button v-else type="button" @click="goOverview">生产总览</button>
          <template v-if="stage === 'branches' || stage === 'grids' || stage === 'alerts'"><span>›</span><strong
              v-if="stage === 'branches' || (stage === 'alerts' && user.role === 'grid')">{{
                selectedProduct?.productName }}</strong><button v-else type="button" @click="goProduct">{{
                selectedProduct?.productName }}</button></template>
          <template v-if="user.role === 'city' && (stage === 'grids' || stage === 'alerts')"><span>›</span><strong
              v-if="stage === 'grids'">{{ selectedBranch?.branchName }}</strong><button v-else type="button"
              @click="goBranch">{{ selectedBranch?.branchName }}</button></template>
          <template v-if="stage === 'alerts'"><span>›</span><strong>{{ selectedGrid?.gridName }}</strong></template>
        </template>
      </nav>

      <template v-if="stage === 'workbench'">
        <section class="workbench-heading">
          <h2>工作台</h2>
        </section>
        <section class="workbench-menu" aria-label="工作台菜单">
          <button type="button" @click="goOverview"><span class="menu-icon menu-icon-blue"><i
                class="menu-glyph menu-glyph-overview" aria-hidden="true"></i></span><span
              class="menu-copy"><strong>生产总览</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
          <button type="button" @click="openSearch"><span class="menu-icon menu-icon-green"><i
                class="menu-glyph menu-glyph-search" aria-hidden="true"></i></span><span
              class="menu-copy"><strong>产能速查</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
          <button type="button" @click="openMonitor"><span class="menu-icon menu-icon-green"><i
                class="menu-glyph menu-glyph-alert" aria-hidden="true"></i></span><span
              class="menu-copy"><strong>低产预警监控</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
          <button type="button" @click="openCampus"><span class="menu-icon menu-icon-blue"><i
                class="menu-glyph menu-glyph-campus" aria-hidden="true"></i></span><span
              class="menu-copy"><strong>校园生产管理</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
          <button v-if="user.isSuperAdmin" type="button" @click="openImports"><span class="menu-icon menu-icon-blue"><i class="action-icon upload-icon" aria-hidden="true"></i></span><span class="menu-copy"><strong>数据导入</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
        </section>
      </template>

      <template v-else-if="stage === 'imports' && user.isSuperAdmin">
        <header class="drill-page-title"><h2>数据导入</h2><p>{{ scopeName }}</p></header>
        <section class="import-navigation" aria-label="数据导入导航">
          <h3>权限与基础资料</h3>
          <button :disabled="loading" type="button" @click="permissionFileInput?.click()"><span
              class="menu-icon menu-icon-blue">导</span><span class="menu-copy"><strong>导入权限表</strong></span><i
              class="menu-chevron" aria-hidden="true"></i></button>
          <button :disabled="loading" type="button" @click="channelFileInput?.click()"><span
              class="menu-icon menu-icon-blue">导</span><span class="menu-copy"><strong>导入渠道维度表</strong></span><i
              class="menu-chevron" aria-hidden="true"></i></button>
          <button :disabled="loading" type="button" @click="terminalFileInput?.click()"><span
              class="menu-icon menu-icon-blue">导</span><span class="menu-copy"><strong>导入末梢表</strong></span><i
              class="menu-chevron" aria-hidden="true"></i></button>
          <button :disabled="loading" type="button" @click="staffFileInput?.click()"><span
              class="menu-icon menu-icon-blue">导</span><span class="menu-copy"><strong>导入员工表</strong></span><i
              class="menu-chevron" aria-hidden="true"></i></button>
          <h3>产能数据</h3>
          <button :disabled="loading" type="button" @click="regionCapacityFileInput?.click()"><span
              class="menu-icon menu-icon-blue">导</span><span class="menu-copy"><strong>导入区域产能</strong></span><i
              class="menu-chevron" aria-hidden="true"></i></button>
          <button :disabled="loading" type="button" @click="channelCapacityFileInput?.click()"><span
              class="menu-icon menu-icon-green">导</span><span class="menu-copy"><strong>导入渠道产能</strong></span><i
              class="menu-chevron" aria-hidden="true"></i></button>
          <button :disabled="loading" type="button" @click="staffCapacityFileInput?.click()"><span
              class="menu-icon menu-icon-blue">导</span><span class="menu-copy"><strong>导入工号产能</strong></span><i
              class="menu-chevron" aria-hidden="true"></i></button>
          <h3>目标与话术</h3>
          <div class="import-navigation-row"><strong>产品目标表</strong><div class="target-actions"><button type="button" :disabled="loading" @click="downloadTargetTemplate"><span class="action-icon download-icon" aria-hidden="true"></span>下载模板</button><button type="button" :disabled="loading" class="target-import" @click="targetFileInput?.click()"><span class="action-icon upload-icon" aria-hidden="true"></span>导入目标表</button></div></div>
          <div class="import-navigation-row"><strong>经典话术表</strong><div class="target-actions"><button type="button" :disabled="loading" @click="downloadScriptTemplate"><span class="action-icon download-icon" aria-hidden="true"></span>下载模板</button><button type="button" :disabled="loading" class="target-import" @click="scriptFileInput?.click()"><span class="action-icon upload-icon" aria-hidden="true"></span>导入话术表</button></div></div>
        </section>
      </template>


      <template v-else-if="stage === 'overview'">
        <section class="overview-heading">
          <div>
            <h2>生产总览</h2><span>{{ scopeName }} · {{ overviewLabel }}</span>
          </div>
          <ChannelTypeFilter v-model="selectedChannelType" @update:model-value="selectedChannel = ''" />
        </section>
        <div class="source-strip"><span>产能：系统取数</span><span v-if="!selectedChannelType">目标：市公司导入</span></div>
        <ProductionBoard :items="overview" :scope="scopeName" :stat-date="dashboard.statDate" :demo="isMock"
          :show-targets="!selectedChannelType" @open="openProduct" />
        <AiAnalysisPanel :summary="overviewAiSummary" :analyze="analyzeOverview" />
        <section class="product-section">
          <div class="section-head">
            <h2>{{ selectedChannelType ? '产能表现' : '产能与目标' }}</h2><span>{{ user.role === 'grid' ? '点击查看预警' : '点击指标查看下级'
            }}</span>
          </div>
          <p class="production-cutoff">数据截止 {{ dashboard.statDate }}<span v-if="isMock"> · 演示数据</span></p>
          <CapacityCard :show-targets="!selectedChannelType" v-for="item in overview" :key="item.productId"
            :title="item.productName" :item="item" :unit="item.unit" :stat-date="dashboard.statDate"
            :icon="productIcon(item.productId)" @open="openProduct(item.productId)" />
        </section>
      </template>

      <template v-else-if="stage === 'branches'">
        <header class="drill-page-title">
          <h2>{{ selectedProduct?.productName }}产能</h2>
          <p>全市 · 分公司</p>
          <ChannelTypeFilter v-model="selectedChannelType" @update:model-value="selectedChannel = ''" />
        </header>
        <p class="production-cutoff">数据截止 {{ dashboard.statDate }}<span v-if="isMock"> · 演示数据</span></p>
        <CapacityCard :show-targets="!selectedChannelType" :title="'全市' + selectedProduct?.productName"
          :item="cityMetric" :unit="selectedProduct?.unit" :stat-date="dashboard.statDate"
          :icon="productIcon(selectedProductId)" :clickable="false" />
        <section class="drill-list">
          <div class="section-head">
            <h2>分公司产能</h2><span>{{ branchMetrics.length }} 个</span>
          </div>
          <CapacityCard :show-targets="!selectedChannelType" v-for="item in branchMetrics" :key="item.branchId"
            :title="item.branchName" :item="item" :unit="selectedProduct?.unit" :stat-date="dashboard.statDate"
            @open="openBranch(item.branchId)" />
        </section>
      </template>

      <template v-else-if="stage === 'grids'">
        <header class="drill-page-title">
          <h2>{{ selectedProduct?.productName }}产能</h2>
          <p>{{ selectedBranch?.branchName }} · 网格</p>
          <ChannelTypeFilter v-model="selectedChannelType" @update:model-value="selectedChannel = ''" />
        </header>
        <p class="production-cutoff">数据截止 {{ dashboard.statDate }}<span v-if="isMock"> · 演示数据</span></p>
        <CapacityCard :show-targets="!selectedChannelType"
          :title="selectedBranch?.branchName + selectedProduct?.productName" :item="branchMetric"
          :unit="selectedProduct?.unit" :stat-date="dashboard.statDate" :icon="productIcon(selectedProductId)"
          :clickable="false" />
        <section class="drill-list">
          <div class="section-head">
            <h2>网格产能</h2><span>{{ gridMetrics.length }} 个</span>
          </div>
          <CapacityCard :show-targets="!selectedChannelType" v-for="item in gridMetrics" :key="item.gridId"
            :title="item.gridName" :item="item" :unit="selectedProduct?.unit" :stat-date="dashboard.statDate"
            @open="openGrid(item.gridId)" />
        </section>
      </template>

      <template v-else-if="stage === 'monitor' || stage === 'alerts'">
        <section class="alert-heading">
          <h2>{{ stage === 'monitor' ? '低产预警监控' : '低产预警' }}</h2><span>{{ stage === 'monitor' ? monitorScopeLabel :
            selectedGrid?.gridName }} · {{ roleLabel }}</span>
        </section>
        <section class="filter-card">
          <div class="monitor-filters">
            <label v-if="stage === 'monitor' && user.role === 'city'" class="monitor-filter">分公司<select
                v-model="monitorBranchId" @change="onMonitorBranchChange">
                <option value="">全部分公司</option>
                <option v-for="branch in dashboard.organization.branches" :key="branch.branchId"
                  :value="branch.branchId">{{ branch.branchName }}</option>
              </select></label>
            <label v-if="stage === 'monitor'" class="monitor-filter">网格<select v-model="monitorGridId"
                :disabled="user.role === 'grid'" @change="selectedChannel = ''">
                <option v-if="user.role !== 'grid'" value="">全部网格</option>
                <option v-for="grid in monitorGrids" :key="grid.gridId" :value="grid.gridId">{{ grid.gridName }}
                </option>
              </select></label>
            <div v-else class="monitor-readonly"><span>所在网格</span><strong>{{ selectedGrid?.gridName }}</strong></div>
            <label v-if="stage === 'monitor'" class="monitor-filter">产品<select v-model="monitorProductId"
                @change="onMonitorProductChange">
                <option v-for="product in dashboard.products" :key="product.productId" :value="product.productId">{{
                  product.productName }}</option>
              </select></label>
            <div v-else class="monitor-readonly"><span>产品</span><strong>{{ selectedProduct?.productName }}</strong>
            </div>
            <div class="threshold-control"><span>低产阈值</span>
              <div><button type="button" aria-label="降低阈值" @click="adjustThreshold(-1)">−</button><input
                  v-model.number="threshold" type="number" min="0" :step="thresholdStep" aria-label="低产阈值" /><button
                  type="button" aria-label="提高阈值" @click="adjustThreshold(1)">+</button></div>
            </div>
            <label class="period-field"><span>统计周期</span><select v-model="alertPeriod" aria-label="预警统计周期">
                <option value="month">本月</option>
                <option value="day">当日</option>
              </select></label>
          </div>
          <label v-if="stage === 'alerts'" class="channel-filter">渠道<select v-model="selectedChannel">
              <option value="">全部渠道</option>
              <option v-for="channel in channelOptions" :key="channel" :value="channel">{{ channel }}</option>
            </select></label>
          <div class="filter-footer"><small>{{ tab === 'people' ? '直销人员' : '渠道合计' }}产能 ≤ {{ cleanThreshold }} {{
            activeProduct?.unit }}，0 为零产</small><button type="button" @click="applyFilters">筛选</button></div>
        </section>
        <AiAnalysisPanel :summary="aiSummary" :analyze="analyzeAlerts" />
        <p v-if="alertLoading" aria-live="polite">正在查询预警...</p>
        <p v-if="alertError" role="alert">{{ alertError }}</p>
        <template v-if="alertResult">
          <div class="alert-summary">
            <div v-for="category in alertCategories" :key="category.id"><span>{{ category.label }}</span><strong>{{
              category.count }}</strong><small>{{ category.id === 'people' ? '人' : '个' }}</small></div>
          </div>
          <div class="tabs alert-category-tabs" role="tablist" aria-label="预警分类"><button
              v-for="category in alertCategories" :key="category.id" type="button" role="tab"
              :aria-selected="tab === category.id" :class="{ active: tab === category.id }"
              @click="selectAlertCategory(category.id)">{{ category.label }}</button></div>
          <section v-if="tab === 'people'" class="list-section">
            <div class="section-head">
              <h2>直销人员 · 零产 / 低产</h2><span>{{ lowPeople.length }} 人</span>
            </div>
            <article v-for="item in lowPeople" :key="`${item.gridId}-${item.staffId}`" class="person-card"
              :data-category="normalizeChannelType(item.channelType)" :class="{ zero: item.production === 0 }"><span
                class="person-avatar" aria-hidden="true"></span>
              <div class="person-main"><strong>{{ item.staffName }}</strong><span class="person-category">{{
                item.staffRole || '岗位未提供' }} · {{ item.staffId || '员工编号未提供' }}</span><span
                  class="alert-organization">{{ branchName(item.branchId) }} · {{ gridName(item.gridId) || '网格未提供'
                  }}</span></div>
              <div class="person-score"><strong>{{ displayNumber(item.production) }}</strong><span>{{
                activeProduct?.unit }}</span></div>
              <p>{{ item.production === 0 ? '零产' : '低产' }}</p>
            </article>
            <p v-if="!lowPeople.length" class="empty-state">当前条件下暂无低产人员</p>
          </section>
          <section v-else class="list-section">
            <div class="section-head">
              <h2>{{ tab === 'stars' ? '3星+渠道' : '末梢渠道' }} · 零产 / 低产</h2><span>{{ displayedChannels.length }} 个</span>
            </div>
            <article v-for="item in displayedChannels"
              :key="`${item.gridId}-${item.channelCode || item.channel}-${item.channelType}`" class="channel-card"
              :data-category="item.channelType">
              <div class="channel-head"><strong>{{ tab === 'tail' ? item.microChannelName || item.channel : item.channel
              }}</strong><span>{{ item.production === 0 ? '零产' : '低产' }}</span></div>
              <div class="channel-category">{{ tab === 'stars' ? `${item.channelStar ? item.channelStar + '星' : '星级未提供'}
                · ${item.channelCode || '渠道编码未提供'}` : item.serviceProvider || '区域服务商未提供' }}</div>
              <div class="alert-organization">{{ branchName(item.branchId) }} · {{ gridName(item.gridId) || '网格未提供' }}
              </div>
              <div class="channel-meta"><span>{{ displayNumber(item.production) }} {{ activeProduct?.unit
              }}</span><span>{{ item.staffCount }} 人</span></div>
            </article>
            <p v-if="!displayedChannels.length" class="empty-state">当前条件下暂无低产渠道</p>
          </section>
        </template>
        <button class="script-library-entry" type="button" @click="openScriptLibrary"><span class="script-library-icon"
            aria-hidden="true"></span><span><strong>经典话术库</strong><small>产品话术 · 沟通参考</small></span><i
            class="menu-chevron" aria-hidden="true"></i></button>
      </template>

      <template v-else-if="stage === 'scripts'">
        <header class="drill-page-title">
          <h2>经典话术库</h2>
          <p>{{ scopeName }}</p>
        </header>
        <div class="script-product-tabs" role="tablist" aria-label="话术产品"><button v-for="product in dashboard.products"
            :key="product.productId" type="button" role="tab" :aria-selected="scriptProductId === product.productId"
            :class="{ active: scriptProductId === product.productId }" @click="scriptProductId = product.productId">{{
              product.productName }}</button></div>
        <SalesScriptPanel :key="scriptProductId" :expanded="true" :script="libraryScript" :product-id="scriptProductId"
          :product-name="libraryProduct?.productName" :can-edit="false" :busy="loading" @copied="showToast('话术已复制')"
          @error="showToast($event, 'warning')" />
      </template>
      <template v-else-if="stage === 'search'">
        <header class="drill-page-title">
          <h2>产能速查</h2>
          <p>个人 / 渠道产能查询</p>
        </header>
        <CapacitySearch :dashboard="dashboard" :grid-ids="scopeGridIds" :scope="scopeName" :demo="isMock"
          :query-api="searchQuery" />
      </template>
      <template v-else-if="stage === 'campus'">
        <section class="campus-placeholder"><span>校园生产管理</span>
          <h2>校园生产通</h2>
          <p>入口待配置</p>
        </section>
      </template>
      <nav v-if="stage !== 'workbench'" class="bottom-nav" aria-label="主导航"><button type="button"
          :class="{ active: stage === 'campus' }" @click="goWorkbench"><i class="bottom-icon bottom-home"
            aria-hidden="true"></i><span>工作台</span></button><button type="button"
          :class="{ active: ['overview', 'branches', 'grids'].includes(stage) }" @click="goOverview"><i
            class="bottom-icon bottom-overview" aria-hidden="true"></i><span>生产总览</span></button><button type="button"
          :class="{ active: ['monitor', 'alerts'].includes(stage) }" @click="openMonitor"><i
            class="bottom-icon bottom-alert" aria-hidden="true"></i><span>预警监控</span></button></nav>
    </main>

    <main v-if="loading" class="loading-mask"><span class="loading-spinner"></span><span>加载中...</span></main>
    <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>

    <input ref="permissionFileInput" type="file" accept=".xlsx,.xls,.csv" hidden
      @change="event => handleImportFile(event, 'permission', permissionRows, '权限表')" />
    <input ref="channelFileInput" type="file" accept=".xlsx,.xls,.csv" hidden @change="handleChannelFile" />
    <input ref="terminalFileInput" type="file" accept=".xlsx,.xls,.csv" hidden @change="handleTerminalFile" />
    <input ref="staffFileInput" type="file" accept=".xlsx,.xls,.csv" hidden @change="handleStaffFile" />
    <input ref="regionCapacityFileInput" type="file" accept=".xlsx,.xls,.csv" hidden
      @change="handleRegionCapacityFile" />
    <input ref="channelCapacityFileInput" type="file" accept=".xlsx,.xls,.csv" hidden
      @change="handleChannelCapacityFile" />
    <input ref="staffCapacityFileInput" type="file" accept=".xlsx,.xls,.csv" hidden @change="handleStaffCapacityFile" />

    <input ref="targetFileInput" type="file" accept=".csv,text/csv" hidden @change="handleTargetFile" />
    <input ref="scriptFileInput" type="file" accept=".csv,text/csv" hidden @change="handleScriptFile" />
    <!-- 导入失败明细弹窗 -->
    <div v-if="importErrorVisible" class="import-error-mask" @click.self="importErrorVisible = false">
      <section class="import-error-sheet">
        <header class="import-error-header">{{ importErrorTitle }}</header>
        <div class="import-error-body">
          <div v-for="(msg, i) in importErrorList" :key="i" class="import-error-item">{{ msg }}</div>
        </div>
        <footer class="import-error-footer">
          <button type="button" @click="importErrorVisible = false">知道了</button>
        </footer>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { isMock } from './api/client'
import { sendLoginCode, loginWithCode, loginWithOneClick } from './api/auth.js'
import { fetchDashboard, fetchPermission, getMobileByToken, fetchAlerts, queryCapacity, importCapacity, importRows, importTargets, saveSalesScript, importSalesScripts, analyzeCapacity } from './api/production'
import { validateScriptImport, scriptTemplateCsv } from './utils/salesScriptImport.js'
import ChannelTypeFilter from './components/ChannelTypeFilter.vue'
import { normalizeChannelType } from './utils/channelTypes.js'
import CapacityCard from './components/CapacityCard.vue'
import SalesScriptPanel from './components/SalesScriptPanel.vue'
import AiAnalysisPanel from './components/AiAnalysisPanel.vue'
import { buildAiSummary } from './utils/aiSummary.js'
import ProductionBoard from './components/ProductionBoard.vue'
import CapacitySearch from './components/CapacitySearch.vue'
import { buildCapacityMetric } from './utils/capacityMetrics.js'
import { permissionRows } from './utils/permissionImport.js'

const page = ref('login')
const stage = ref('workbench')
const loading = ref(false)
const token = ref('')
const loginPhone = ref('')
const loginCode = ref('')
const codeSending = ref(false)
const codeCountdown = ref(0)
const codePhone = ref('')
let codeTimer
const agreedToTerms = ref(false)
const user = reactive({ name: '', phone: '', role: '', branchId: '', branchName: '', gridId: '', gridName: '', cityName: '', isSuperAdmin: false })
const scriptFileInput = ref(null)
const dashboard = reactive({ organization: { cityName: '', branches: [], grids: [] }, statDate: '', products: [], targets: [], rows: [], dailyRows: [], salesScripts: [] })
const selectedProductId = ref('')
const selectedBranchId = ref('')
const selectedGridId = ref('')
const monitorBranchId = ref('')
const monitorGridId = ref('')
const monitorProductId = ref('')
const selectedChannel = ref('')
const selectedChannelType = ref('')
const threshold = ref(1)
const alertPeriod = ref('month')
const tab = ref('people')
const targetFileInput = ref(null)
const toast = reactive({ show: false, type: 'success', message: '' })
const channelFileInput = ref(null)
const permissionFileInput = ref(null)
const terminalFileInput = ref(null)
const staffFileInput = ref(null)
const regionCapacityFileInput = ref(null)
const channelCapacityFileInput = ref(null)
const staffCapacityFileInput = ref(null)
const importErrorVisible = ref(false)
const importErrorTitle = ref('')
const importErrorList = ref([])
const alertResult = ref(null)
const alertLoading = ref(false), alertError = ref('')
let alertSequence = 0

const scopeName = computed(() => user.role === 'city' ? dashboard.organization.cityName : user.role === 'grid' ? user.gridName : user.branchName)
const roleLabel = computed(() => user.isSuperAdmin === true ? '超级管理员' : ({ city: '市公司', branch: '分公司', grid: '网格长' })[user.role] || '')
const overviewLabel = computed(() => ({ city: '全市生产总览', branch: '分公司生产总览', grid: '网格生产总览' })[user.role] || '生产总览')
const selectedProduct = computed(() => dashboard.products.find(item => item.productId === selectedProductId.value))
const activeProduct = computed(() => dashboard.products.find(item => item.productId === (stage.value === 'monitor' ? monitorProductId.value : selectedProductId.value)))
const scriptProductId = ref('')
const scriptReturnStage = ref('monitor')
const libraryScript = computed(() => dashboard.salesScripts.find(item => item.productId === scriptProductId.value))
const libraryProduct = computed(() => dashboard.products.find(item => item.productId === scriptProductId.value))
const selectedBranch = computed(() => dashboard.organization.branches.find(item => item.branchId === selectedBranchId.value))
const selectedGrid = computed(() => dashboard.organization.grids.find(item => item.gridId === selectedGridId.value))
const thresholdStep = computed(() => activeProduct.value?.productId === 'terminal' ? 0.1 : 1)
const cleanThreshold = computed(() => {
  const value = Math.max(0, Number(threshold.value) || 0)
  return Math.round(Math.floor(value / thresholdStep.value + 1e-9) * thresholdStep.value * 10) / 10
})

function metric(productId, gridIds, scope = null) {
  return buildCapacityMetric(dashboard, productId, gridIds, selectedChannelType.value, scope)
}

function gridsOf(branchId) { return dashboard.organization.grids.filter(item => item.branchId === branchId).map(item => item.gridId) }
const scopeGridIds = computed(() => user.role === 'city' ? dashboard.organization.grids.map(item => item.gridId) : user.role === 'grid' ? [user.gridId] : gridsOf(user.branchId))
const overview = computed(() => dashboard.products.map(item => ({ ...item, ...metric(item.productId, scopeGridIds.value, { level: user.role, id: user.role === 'grid' ? user.gridId : user.branchId }) })))
const overviewAiSummary = computed(() => ({
  scope: scopeName.value, product: '全产品生产总览', statDate: dashboard.statDate, demo: isMock, channelType: selectedChannelType.value || '全部类型',
  products: overview.value.map(item => buildAiSummary({ scope: scopeName.value, product: item, statDate: dashboard.statDate, demo: isMock, period: 'day-and-month', metric: item, categories: [], showTargets: !selectedChannelType.value }))
}))
const cityMetric = computed(() => metric(selectedProductId.value, scopeGridIds.value, { level: 'city' }))
const branchMetric = computed(() => metric(selectedProductId.value, gridsOf(selectedBranchId.value), { level: 'branch', id: selectedBranchId.value }))
const branchMetrics = computed(() => dashboard.organization.branches.map(item => ({ ...item, ...metric(selectedProductId.value, gridsOf(item.branchId), { level: ['未知', '市统筹'].includes(item.branchId) ? 'grid' : 'branch', id: ['未知', '市统筹'].includes(item.branchId) ? `${item.branchId}::${item.branchId}` : item.branchId }) })))
const gridMetrics = computed(() => dashboard.organization.grids.filter(item => item.branchId === selectedBranchId.value).map(item => ({ ...item, ...metric(selectedProductId.value, [item.gridId], { level: 'grid', id: item.gridId }) })))
const monitorGrids = computed(() => dashboard.organization.grids.filter(item => !monitorBranchId.value || item.branchId === monitorBranchId.value))
const monitorGridIds = computed(() => monitorGridId.value ? [monitorGridId.value] : monitorGrids.value.map(item => item.gridId))
const monitorScopeLabel = computed(() => monitorGridId.value ? gridName(monitorGridId.value) : monitorBranchId.value ? dashboard.organization.branches.find(item => item.branchId === monitorBranchId.value)?.branchName : scopeName.value)
const alertRows = computed(() => {
  const ids = new Set(stage.value === 'monitor' ? monitorGridIds.value : [selectedGridId.value])
  const source = alertPeriod.value === 'day' ? dashboard.dailyRows.filter(item => item.date === dashboard.statDate) : dashboard.rows
  return source.filter(item => ids.has(item.gridId) && item.productId === activeProduct.value?.productId)
})
const channelOptions = computed(() => [...new Set(alertRows.value.map(item => item.channel || '未归类'))].sort((a, b) => a.localeCompare(b, 'zh-CN')))
const lowPeople = computed(() => alertResult.value?.people || [])
const lowChannels = computed(() => alertResult.value?.channels || [])

const alertCategories = computed(() => [
  { id: 'people', label: '直销人员', count: alertResult.value ? lowPeople.value.length : null },
  { id: 'stars', label: '3星+渠道', count: alertResult.value ? lowChannels.value.filter(item => item.channelType === '三星+渠道').length : null },
  { id: 'tail', label: '末梢渠道', count: alertResult.value ? lowChannels.value.filter(item => item.channelType === '末梢渠道').length : null }
])
const displayedChannels = computed(() => lowChannels.value.filter(item => item.channelType === (tab.value === 'stars' ? '三星+渠道' : '末梢渠道')))
const aiSummary = computed(() => {
  const ids = (stage.value === 'monitor' ? monitorGridIds.value : [selectedGridId.value]).filter(id => scopeGridIds.value.includes(id))
  return buildAiSummary({
    scope: stage.value === 'monitor' ? monitorScopeLabel.value : selectedGrid.value?.gridName, product: activeProduct.value, statDate: dashboard.statDate, demo: isMock, period: alertPeriod.value, threshold: cleanThreshold.value,
    metric: buildCapacityMetric(dashboard, activeProduct.value?.productId, ids), categories: alertCategories.value
  })
})
function selectAlertCategory(id) { tab.value = id; selectedChannel.value = '' }

function displayNumber(value) { return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) }
function productIcon(id) { return ({ newNumbers: 'contact', plan119: 'gift', terminal: 'smartphone', homeBroadband: 'house', gigabit: 'wifi' })[id] || 'chart-no-axes-combined' }
function gridName(id) { return dashboard.organization.grids.find(item => item.gridId === id)?.gridName || '' }
function branchName(id) { return dashboard.organization.branches.find(item => item.branchId === id)?.branchName || '分公司未提供' }
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
function openSearch() { stage.value = 'search'; scrollTop() }
function openImports() { if (user.isSuperAdmin !== true) return showToast('仅超级管理员可导入数据', 'warning'); stage.value = 'imports'; scrollTop() }
const analyzeOverview = request => analyzeCapacity({ ...request, view: 'overview', channelType: selectedChannelType.value }, token.value)
const analyzeAlerts = request => analyzeCapacity({ ...request, view: 'alerts', productId: activeProduct.value?.productId, gridIds: stage.value === 'monitor' ? monitorGridIds.value : [selectedGridId.value], threshold: cleanThreshold.value, period: alertPeriod.value, channel: selectedChannel.value }, token.value)
function openScriptLibrary() { scriptReturnStage.value = stage.value; scriptProductId.value = activeProduct.value?.productId || dashboard.products[0]?.productId || ''; stage.value = 'scripts'; scrollTop() }
function returnFromScripts() { stage.value = scriptReturnStage.value; scrollTop() }
function onMonitorBranchChange() { monitorGridId.value = ''; selectedChannel.value = '' }
function onMonitorProductChange() { threshold.value = 1; selectedChannel.value = ''; tab.value = 'people' }
function adjustThreshold(direction) { threshold.value = Math.round((cleanThreshold.value + direction * thresholdStep.value) * 10) / 10; if (threshold.value < 0) threshold.value = 0 }
async function loadAlerts() {
  const id = ++alertSequence
  alertResult.value = null
  alertLoading.value = false; alertError.value = ''
  if (!['monitor', 'alerts'].includes(stage.value) || !activeProduct.value) return
  alertLoading.value = true
  try {
    const data = await fetchAlerts({ phone: user.phone, productId: activeProduct.value.productId, gridIds: stage.value === 'monitor' ? monitorGridIds.value : [selectedGridId.value], threshold: cleanThreshold.value, period: alertPeriod.value, channel: selectedChannel.value }, token.value)
    if (id === alertSequence) alertResult.value = data
  } catch (error) { if (id === alertSequence) { alertError.value = error.message || '预警查询失败'; showToast(alertError.value, 'error') } }
  finally { if (id === alertSequence) alertLoading.value = false }
}
watch([stage, monitorBranchId, monitorGridId, monitorProductId, selectedGridId, selectedProductId, cleanThreshold, alertPeriod, selectedChannel], loadAlerts)
async function applyFilters() { await loadAlerts(); document.querySelector('.alert-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
const searchQuery = params => queryCapacity({ ...params, phone: user.phone }, token.value)

onMounted(async () => {
  const params = new URLSearchParams(location.search)
  token.value = params.get('token') || ''
  loginPhone.value = params.get('phone') || params.get('mobile') || ''
  if (token.value && !isMock) {
    try { loginPhone.value = (await getMobileByToken(token.value)).mobile } catch (error) { showToast(error.message || '认证失败', 'error') }
    const url = new URL(location.href); url.searchParams.delete('token'); history.replaceState(null, '', url)
  }
  window.addEventListener('handle2-auth-expired', expireSession)
})
onUnmounted(() => { window.removeEventListener('handle2-auth-expired', expireSession); clearInterval(codeTimer) })
watch(loginPhone, () => { codePhone.value = ''; loginCode.value = '' })
function expireSession() { token.value = ''; page.value = 'login'; alertSequence++; alertResult.value = null; Object.assign(dashboard, { organization: { cityName: '', branches: [], grids: [] }, rows: [], dailyRows: [], targets: [], regionRows: undefined, periodRows: [], salesScripts: [] }); showToast('登录已过期，请重新认证', 'warning') }

async function handleLogin() {
  if (loading.value || codeSending.value) return
  if (!agreedToTerms.value) return showToast('请先同意登录协议', 'warning')
  if (!/^1\d{10}$/.test(loginPhone.value)) return showToast('请输入正确的11位手机号', 'warning')
  loading.value = true
  try {
    const phone = loginPhone.value
    let identity
    if (token.value && !isMock) {
      identity = { mobile: (await getMobileByToken(token.value)).mobile, token: token.value }
    }
    else {
      if (!isMock && codePhone.value !== phone) throw new Error('请先为当前手机号获取验证码')
      identity = await loginWithCode(phone, loginCode.value)
    }
    await completeLogin(identity)
  } catch (error) { token.value = ''; showToast(error.message || '登录失败', 'error') } finally { loading.value = false }
}

async function completeLogin(identity) {
  if (!/^1\d{10}$/.test(identity.mobile) || !identity.token) throw new Error('认证未返回有效手机号或token')
  token.value = identity.token
  const permission = await fetchPermission(identity.mobile, identity.token)
  if (!permission || !['city', 'branch', 'grid'].includes(permission.role) || (permission.role !== 'city' && !permission.branchId) || (permission.role === 'grid' && !permission.gridId)) throw new Error('该手机号暂无查看权限')
  Object.assign(user, { isSuperAdmin: false }, permission)
  await loadDashboard()
  goWorkbench()
  page.value = 'dashboard'
  codePhone.value = ''; loginCode.value = ''; codeCountdown.value = 0; clearInterval(codeTimer)
}

async function loadDashboard() {
  const data = await fetchDashboard({ phone: user.phone }, token.value)
  dashboard.organization = data.organization || { cityName: '', branches: [], grids: [] }
  dashboard.statDate = data.statDate || ''
  dashboard.products = data.products || []
  dashboard.targets = data.targets || []
  dashboard.rows = data.rows || []
  dashboard.dailyRows = data.dailyRows || []
  dashboard.salesScripts = data.salesScripts || []
  dashboard.regionRows = data.regionRows
  dashboard.periodRows = data.periodRows || []
  if (data.permission) Object.assign(user, data.permission)
  if (data.warnings?.length) showToast(data.warnings[0], 'warning')
  await loadAlerts()
}

async function handleSaveSalesScript(script) {
  loading.value = true
  try {
    if (user.isSuperAdmin !== true) throw new Error('仅超级管理员可维护话术')
    await saveSalesScript(script, user, token.value)
    await loadDashboard()
    showToast('话术已保存，更新时间已记录')
  } catch (error) { showToast(error.message || '话术保存失败', 'error') }
  finally { loading.value = false }
}

function downloadScriptTemplate() {
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可下载话术模板', 'warning')
  const url = URL.createObjectURL(new Blob([scriptTemplateCsv(dashboard.products)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = '经典话术导入模板.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
async function handleScriptFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  loading.value = true
  try {
    if (user.isSuperAdmin !== true) throw new Error('仅超级管理员可导入话术')
    if (!/\.csv$/i.test(file.name)) throw new Error('请导入CSV格式话术模板')
    if (file.size > 200000) throw new Error('文件大小不能超过200KB')
    const rows = validateScriptImport(parseCsv((await file.text()).replace(/^\ufeff/, '')), dashboard.products)
    const result = await importSalesScripts(rows, user, token.value)
    await loadDashboard()
    showToast(`已导入 ${result.imported} 条话术`)
  } catch (error) { showToast(error.message || '话术导入失败', 'error') }
  finally { loading.value = false }
}

async function refreshDashboard() { loading.value = true; try { await loadDashboard(); showToast('数据已刷新') } catch (error) { showToast(error.message || '刷新失败', 'error') } finally { loading.value = false } }
async function refreshAfterImport() { try { await loadDashboard() } catch (error) { showImportErrors('导入后的看板暂未就绪', [error.message || '请完成同日三张产能导入后刷新']) } }
async function sendCode() {
  if (loading.value || codeSending.value || codeCountdown.value > 0) return
  if (!agreedToTerms.value) return showToast('请先同意登录协议', 'warning')
  if (!/^1\d{10}$/.test(loginPhone.value)) return showToast('请先输入正确的手机号', 'warning')
  const phone = loginPhone.value
  codeSending.value = true
  try {
    await sendLoginCode(phone)
    if (phone !== loginPhone.value) return showToast('手机号已变更，请重新获取验证码', 'warning')
    codePhone.value = phone
    if (isMock) loginCode.value = '123456'
    codeCountdown.value = 60
    clearInterval(codeTimer)
    codeTimer = setInterval(() => { if (--codeCountdown.value <= 0) clearInterval(codeTimer) }, 1000)
    showToast(isMock ? '模拟验证码：123456' : '验证码请求已提交')
  } catch (error) { codePhone.value = ''; showToast(error.message || '验证码发送失败', 'error') }
  finally { codeSending.value = false }
}
async function oneClickLogin() {
  if (loading.value || codeSending.value) return
  if (!agreedToTerms.value) return showToast('请先同意登录协议', 'warning')
  loading.value = true
  try { await completeLogin(await loginWithOneClick()) }
  catch (error) { token.value = ''; showToast(error.message || '一键登录失败，请使用短信登录', 'error') }
  finally { loading.value = false }
}

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
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可下载目标模板', 'warning')
  const lines = ['gridId,productId,target,dailyTarget,targetDate', ...dashboard.organization.grids.flatMap(grid => dashboard.products.map(product => {
    const item = dashboard.targets.find(item => item.gridId === grid.gridId && item.productId === product.productId && !item.channelType)
    return `${grid.gridId},${product.productId},${item?.target ?? ''},${item?.targetDate === dashboard.statDate ? item?.dailyTarget ?? '' : ''},${dashboard.statDate}`
  }))]
  const url = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = '网格产品目标模板.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function handleTargetFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    if (user.isSuperAdmin !== true) throw new Error('仅超级管理员可导入目标')
    const data = parseCsv((await file.text()).replace(/^\ufeff/, ''))
    const includesDaily = data[0]?.join(',') === 'gridId,productId,target,dailyTarget,targetDate'
    if (!includesDaily && data[0]?.join(',') !== 'gridId,productId,target') throw new Error('请使用下载的目标模板，或旧版三列月目标模板')
    const validKeys = new Set(dashboard.organization.grids.flatMap(grid => dashboard.products.map(product => `${grid.gridId}|${product.productId}`)))
    const imported = new Map()
    for (const [index, row] of data.slice(1).entries()) {
      if (row.length !== (includesDaily ? 5 : 3)) throw new Error(`第 ${index + 2} 行列数不正确`)
      const [gridId, productId, rawTarget, rawDaily, targetDate] = row; const key = `${gridId}|${productId}`; const target = Number(rawTarget)
      if (!validKeys.has(key)) throw new Error(`第 ${index + 2} 行网格或产品无效`)
      if (imported.has(key)) throw new Error(`第 ${index + 2} 行目标重复`)
      if (rawTarget === '' || !Number.isFinite(target) || target < 0) throw new Error(`第 ${index + 2} 行目标值无效`)
      const previous = dashboard.targets.find(item => item.gridId === gridId && item.productId === productId && !item.channelType)
      const daily = includesDaily ? (rawDaily === '' ? null : Number(rawDaily)) : previous?.dailyTarget ?? null
      if (daily !== null && (!Number.isFinite(daily) || daily < 0)) throw new Error(`第 ${index + 2} 行日目标无效`)
      if (includesDaily && targetDate !== dashboard.statDate) throw new Error(`第 ${index + 2} 行日目标日期须为数据截止日 ${dashboard.statDate}`)
      imported.set(key, { gridId, productId, target, dailyTarget: daily, targetDate: includesDaily ? targetDate : previous?.targetDate || dashboard.statDate })
    }
    if (imported.size !== validKeys.size) throw new Error(`目标表须包含全部 ${validKeys.size} 条网格产品记录`)
    loading.value = true
    await importTargets([...imported.values()], user, token.value)
    await loadDashboard()
    showToast(`已导入 ${imported.size} 条目标`)
  } catch (error) { showToast(error.message || '导入失败', 'error') } finally { loading.value = false }
}

// ==================== 渠道维度表导入 ====================
const CHANNEL_COLUMN_MAP = {
  '全网统一渠道编码': 'uni_code',
  '渠道编码': 'chn_code',
  '渠道名称': 'chn_name',
  '分公司': 'branch',
  '网格编码': 'grid_code',
  '网格': 'grid',
  '渠道星级': 'star',
  '渠道状态': 'status'
}

const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }

function parseStarLevel(text) {
  const s = String(text || '').trim()
  if (!s) return 0
  const ar = s.match(/(\d+)\s*星/)
  if (ar) return Number(ar[1])
  const cn = s.match(/([一二三四五六七八九十])\s*星/)
  if (cn) return CN_NUM[cn[1]] || 0
  return 0
}

function normalizeStar(text) {
  return parseStarLevel(text) >= 3 ? '三星+' : '非三星+'
}

function buildChannelRows(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('文件内容为空')
  const header = data[0].map(item => String(item || '').trim())
  const REQUIRED_COLS = ['全网统一渠道编码', '渠道编码', '渠道名称', '分公司', '网格编码', '网格', '渠道星级']
  const missing = REQUIRED_COLS.filter(col => !header.includes(col))
  if (missing.length) throw new Error(`缺少列：${missing.join('、')}`)

  const rows = []
  for (let i = 1; i < data.length; i++) {
    const line = data[i]
    if (!line || !line.some(cell => String(cell || '').trim())) continue
    const record = {}
    Object.keys(CHANNEL_COLUMN_MAP).forEach(col => {
      const index = header.indexOf(col)
      const field = CHANNEL_COLUMN_MAP[col]
      record[field] = String(index >= 0 && line[index] != null ? line[index] : '').trim()
    })
    if (!record.chn_code) continue
    if (record.status !== '正常营业') continue
    record.star_level = normalizeStar(record.star)
    delete record.status
    rows.push(record)
  }
  if (!rows.length) throw new Error('文件无有效数据行（可能没有“正常营业”的渠道）')
  return rows
}

// ==================== 末梢表导入 ====================
const TERMINAL_COLUMN_MAP = {
  '工号编码': 'staff_no',
  '工号名称': 'staff_name',
  '区域服务商': 'agent',
  '分公司': 'branch',
  '网格': 'grid',
  '小微渠道名称': 'chn_name'
}

function buildTerminalRows(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('文件内容为空')
  const header = data[0].map(item => String(item || '').trim())
  const REQUIRED_COLS = ['工号编码', '工号名称', '分公司', '网格']
  const missing = REQUIRED_COLS.filter(col => !header.includes(col))
  if (missing.length) throw new Error(`缺少列：${missing.join('、')}`)

  const rows = []
  for (let i = 1; i < data.length; i++) {
    const line = data[i]
    if (!line || !line.some(cell => String(cell || '').trim())) continue
    const record = {}
    Object.keys(TERMINAL_COLUMN_MAP).forEach(col => {
      const index = header.indexOf(col)
      const field = TERMINAL_COLUMN_MAP[col]
      record[field] = String(index >= 0 && line[index] != null ? line[index] : '').trim()
    })
    if (!record.staff_no) continue
    rows.push(record)
  }
  if (!rows.length) throw new Error('文件无有效数据行')
  return rows
}

// ==================== 员工表导入 ====================
const STAFF_COLUMN_MAP = {
  '工号': 'staff_no',
  '分公司': 'branch',
  '网格': 'grid',
  '姓名': 'staff_name',
  '岗位名称': 'job',
  '队伍类型': 'team_type'
}

function buildStaffRows(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('文件内容为空')
  const header = data[0].map(item => String(item || '').trim())
  const REQUIRED_COLS = ['工号', '分公司', '网格', '姓名']
  const missing = REQUIRED_COLS.filter(col => !header.includes(col))
  if (missing.length) throw new Error(`缺少列：${missing.join('、')}`)

  const rows = []
  for (let i = 1; i < data.length; i++) {
    const line = data[i]
    if (!line || !line.some(cell => String(cell || '').trim())) continue
    const record = {}
    Object.keys(STAFF_COLUMN_MAP).forEach(col => {
      const index = header.indexOf(col)
      const field = STAFF_COLUMN_MAP[col]
      record[field] = String(index >= 0 && line[index] != null ? line[index] : '').trim()
    })
    if (!record.staff_no) continue
    rows.push(record)
  }
  if (!rows.length) throw new Error('文件无有效数据行')
  return rows
}

// ==================== 产能导入列映射 ====================
const REGION_CAPACITY_COLUMN_MAP = {
  '分公司': 'branch_company',
  '网格': 'grid_name',
  '产能类型（时间）': 'prod_period_type',
  '产品名': 'product_name',
  '产能': 'capacity',
  '统计日期': 'stat_date',
  '取数时间': 'snapshot_time'
}

const CHANNEL_CAPACITY_COLUMN_MAP = {
  '分公司': 'branch_company',
  '网格': 'grid_name',
  '渠道编码': 'channel_code',
  '渠道名称': 'channel_name',
  '产能类型（时间）': 'prod_period_type',
  '产品名': 'product_name',
  '产能': 'capacity',
  '统计日期': 'stat_date',
  '取数时间': 'snapshot_time'
}

const STAFF_CAPACITY_COLUMN_MAP = {
  '分公司': 'branch_company',
  '网格': 'grid_name',
  '渠道编码': 'channel_code',
  '渠道名称': 'channel_name',
  '员工编号': 'staff_no',
  '产能类型（时间）': 'prod_period_type',
  '产品名': 'product_name',
  '产能': 'capacity',
  '统计日期': 'stat_date',
  '取数时间': 'snapshot_time'
}

function buildRegionCapacityRows(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('文件内容为空')
  const header = data[0].map(item => String(item || '').trim())
  const REQUIRED_COLS = ['分公司', '网格', '产能类型（时间）', '产品名', '产能', '统计日期']
  const missing = REQUIRED_COLS.filter(col => !header.includes(col))
  if (missing.length) throw new Error(`缺少列：${missing.join('、')}`)

  const rows = []
  for (let i = 1; i < data.length; i++) {
    const line = data[i]
    if (!line || !line.some(cell => String(cell || '').trim())) continue
    const record = {}
    Object.keys(REGION_CAPACITY_COLUMN_MAP).forEach(col => {
      const index = header.indexOf(col)
      const field = REGION_CAPACITY_COLUMN_MAP[col]
      record[field] = String(index >= 0 && line[index] != null ? line[index] : '').trim()
    })
    if (!record.branch_company || !record.grid_name || !record.product_name) continue
    rows.push(record)
  }
  if (!rows.length) throw new Error('文件无有效数据行')
  return rows
}

function buildChannelCapacityRows(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('文件内容为空')
  const header = data[0].map(item => String(item || '').trim())
  const REQUIRED_COLS = ['分公司', '网格', '渠道名称', '产能类型（时间）', '产品名', '产能', '统计日期']
  const missing = REQUIRED_COLS.filter(col => !header.includes(col))
  if (missing.length) throw new Error(`缺少列：${missing.join('、')}`)

  const rows = []
  for (let i = 1; i < data.length; i++) {
    const line = data[i]
    if (!line || !line.some(cell => String(cell || '').trim())) continue
    const record = {}
    Object.keys(CHANNEL_CAPACITY_COLUMN_MAP).forEach(col => {
      const index = header.indexOf(col)
      const field = CHANNEL_CAPACITY_COLUMN_MAP[col]
      record[field] = String(index >= 0 && line[index] != null ? line[index] : '').trim()
    })
    if (!record.branch_company || !record.grid_name || !record.channel_name || !record.product_name) continue
    rows.push(record)
  }
  if (!rows.length) throw new Error('文件无有效数据行')
  return rows
}

function buildStaffCapacityRows(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('文件内容为空')
  const header = data[0].map(item => String(item || '').trim())
  const REQUIRED_COLS = ['分公司', '网格', '渠道名称', '员工编号', '产能类型（时间）', '产品名', '产能', '统计日期']
  const missing = REQUIRED_COLS.filter(col => !header.includes(col))
  if (missing.length) throw new Error(`缺少列：${missing.join('、')}`)

  const rows = []
  for (let i = 1; i < data.length; i++) {
    const line = data[i]
    if (!line || !line.some(cell => String(cell || '').trim())) continue
    const record = {}
    Object.keys(STAFF_CAPACITY_COLUMN_MAP).forEach(col => {
      const index = header.indexOf(col)
      const field = STAFF_CAPACITY_COLUMN_MAP[col]
      record[field] = String(index >= 0 && line[index] != null ? line[index] : '').trim()
    })
    if (!record.branch_company || !record.grid_name || !record.staff_no || !record.product_name) continue
    rows.push(record)
  }
  if (!rows.length) throw new Error('文件无有效数据行')
  return rows
}

// ==================== 产能类型 / 日期归一化 ====================
const PERIOD_TYPE_MAP = {
  '月产能（mon）': 'mon',
  '日产能（day）': 'day',
  '7天产能（week）': 'week',
  '上月同期产能（last mon）': 'last_mon',
  'mon': 'mon',
  'day': 'day',
  'week': 'week',
  'last_mon': 'last_mon'
}

function normalizePeriodType(value) {
  return PERIOD_TYPE_MAP[String(value || '').trim()] || String(value || '').trim()
}

function normalizeStatDate(value) {
  const s = String(value || '').trim()
  if (!s) return ''
  const m = s.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return s
}

function normalizeSnapshotTime(value) {
  const s = String(value || '').trim()
  if (!s) return ''
  const m = s.match(/^(\d{4})(\d{2})(\d{2})\s+(\d{2})(\d{2})(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`
  return s
}

// ==================== 通用上传处理 ====================
async function handleImportFile(event, target, buildRows, label) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (loading.value) return
  if (file.size > 5 * 1024 * 1024) {
    showToast('文件过大，请控制在 5MB 以内', 'warning')
    return
  }
  loading.value = true
  try {
    const data = await parseExcelFile(file)
    const rows = buildRows(data)
    if (!user.isSuperAdmin) throw new Error('仅超级管理员可导入')
    const result = await importRows(target, rows, token.value, user)
    await refreshAfterImport()
    if (result?.failed > 0) {
      showToast(`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`, 'warning')
      showImportErrors(
        `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`,
        result.errors || []
      )
    } else {
      showToast(`导入成功，共 ${result.success} 条`)
    }
  } catch (error) {
    showToast(error.message || `${label}导入失败`, 'error')
  } finally {
    loading.value = false
  }
}

async function handleCapacityImportFile(event, target, buildRows, label) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (loading.value) return
  if (file.size > 5 * 1024 * 1024) {
    showToast('文件过大，请控制在 5MB 以内', 'warning')
    return
  }
  loading.value = true
  try {
    const data = await parseExcelFile(file, { region: '区域汇总取数', channel: '渠道汇总取数', staff: '工号汇总取数' }[target])
    let rows = buildRows(data)

    rows = rows.map(r => ({
      ...r,
      prod_period_type: normalizePeriodType(r.prod_period_type),
      stat_date: normalizeStatDate(r.stat_date),
      snapshot_time: normalizeSnapshotTime(r.snapshot_time)
    }))

    if (!user.isSuperAdmin) throw new Error('仅超级管理员可导入')
    const result = await importCapacity(target, rows, token.value)
    await refreshAfterImport()
    if (result?.failed > 0) {
      showToast(`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`, 'warning')
      showImportErrors(
        `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`,
        result.errors || []
      )
    } else {
      showToast(`导入成功，共 ${result.success} 条`)
    }
  } catch (error) {
    showToast(error.message || `${label}导入失败`, 'error')
  } finally {
    loading.value = false
  }
}

function handleChannelFile(event) {
  return handleImportFile(event, 'channelInfo', buildChannelRows, '渠道维度表')
}
function handleTerminalFile(event) {
  return handleImportFile(event, 'terminal', buildTerminalRows, '末梢表')
}
function handleStaffFile(event) {
  return handleImportFile(event, 'staff', buildStaffRows, '员工表')
}
function handleRegionCapacityFile(event) {
  return handleCapacityImportFile(event, 'region', buildRegionCapacityRows, '区域产能')
}
function handleChannelCapacityFile(event) {
  return handleCapacityImportFile(event, 'channel', buildChannelCapacityRows, '渠道产能')
}
function handleStaffCapacityFile(event) {
  return handleCapacityImportFile(event, 'staff', buildStaffCapacityRows, '工号产能')
}

/**
 * 解析 Excel / CSV 文件为二维数组
 * @param {File} file - 用户选择的文件
 * @returns {Promise<string[][]>} 二维数组，首行为表头
 */
function importTable(data) {
  const header = data.findIndex(row => row.includes('分公司') && row.includes('网格') && (row.includes('产品名') || row.includes('工号编码') || row.includes('工号') || row.includes('渠道编码') || row.includes('手机号')))
  if (header < 0) throw new Error('没有找到有效表头')
  return data.slice(header).filter(row => !String(row[0] || '').startsWith('仅供联调'))
}
async function parseExcelFile(file, sheetHint = '') {
  const name = file.name || ''

  if (/\.csv$/i.test(name)) {
    const text = (await file.text()).replace(/^\ufeff/, '')
    return importTable(parseCsv(text))
  }

  await ensureXlsx()

  if (typeof window.XLSX === 'undefined') {
    throw new Error('Excel 解析组件未加载')
  }

  const buffer = await file.arrayBuffer()
  const workbook = window.XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames.includes(sheetHint) ? sheetHint : workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return importTable(window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }))
}

/**
 * 动态加载 SheetJS，用于解析 .xlsx / .xls
 * @returns {Promise<void>}
 */
function ensureXlsx() {
  if (window.XLSX) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve()
      else {
        existing.addEventListener('load', resolve, { once: true })
        existing.addEventListener('error', () => reject(new Error('SheetJS 加载失败')), { once: true })
      }
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error('SheetJS 加载失败'))
    document.head.appendChild(script)
  })
}

/**
 * 展示导入失败明细弹窗
 * @param {string} title - 弹窗标题
 * @param {string[]} errors - 错误信息数组
 */
function showImportErrors(title, errors) {
  const list = Array.isArray(errors) ? errors : []
  const MAX_SHOW = 100
  const shown = list.slice(0, MAX_SHOW)
  if (list.length > MAX_SHOW) {
    shown.push(`…… 以及其余 ${list.length - MAX_SHOW} 条错误，建议分批处理`)
  }
  importErrorTitle.value = title
  importErrorList.value = shown
  importErrorVisible.value = true
}

function showToast(message, type = 'success') { toast.message = message; toast.type = type; toast.show = true; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.show = false }, 3000) }
</script>
