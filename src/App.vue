<template>
  <div class="app-shell">
    <main v-if="sessionChecking" class="session-check" role="status"><span class="session-spinner" aria-hidden="true"></span><p>正在验证登录状态…</p></main>
    <main v-else-if="page === 'login'" class="login-page">
      <section class="brand-panel">
        <BrandHeading />
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
        <p v-if="authFeedback" class="login-auth-feedback" role="status">{{ authFeedback }}</p>
        <button class="primary-login" type="button" :disabled="loading || codeSending" @click="handleLogin">{{ loading ?
          '登录中' : '登录' }}</button>
        <button class="quick-login" type="button" :disabled="loading || codeSending"
          @click="oneClickLogin">本机号码一键登录</button>
        <label class="login-agreement"><input v-model="agreedToTerms" type="checkbox"
            aria-label="同意登录服务条款和隐私协议" /><span>登录即同意 <span class="agreement-link">《中国移动号码服务条款》</span><span
              class="agreement-link">《中国移动广东公司电子渠道登录服务协议》</span>和<span
              class="agreement-link">《隐私协议》</span></span></label>
        <div v-if="isMock" class="demo-accounts"><span>演示身份</span><button type="button"
            @click="loginPhone = '13800000009'">超管</button><button type="button"
            @click="loginPhone = '13800000000'">市公司</button><button type="button"
            @click="loginPhone = '13800000001'">分公司</button><button type="button"
            @click="loginPhone = '13800000003'">网格长</button></div>
      </section>
    </main>

    <main v-else class="dashboard-page" :class="{'production-overview-page':stage === 'overview','broadband-page':stage === 'broadband'}">
      <header v-if="stage === 'workbench'" class="top-bar">
        <div>
          <BrandHeading compact />
          <p>{{ scopeName }} · {{ roleLabel }} <em v-if="isMock">演示数据</em></p>
        </div>
        <button type="button" title="刷新数据" aria-label="刷新数据" @click="refreshDashboard"><span class="toolbar-icon"
            aria-hidden="true"></span></button>
      </header>

      <nav v-if="stage !== 'workbench'" class="breadcrumbs" aria-label="当前位置">
        <button type="button" @click="goWorkbench">工作台</button><span>›</span>
        <template v-if="stage === 'warnings'"><strong>预警监控</strong></template><template v-else-if="stage === 'monitor'"><button type="button" @click="openMonitor">预警监控</button><span>›</span><strong>{{ isChangeAlert ? '异动预警' : '低产预警' }}</strong></template>
        <template v-else-if="stage === 'campus'"><strong>校园生产管理</strong></template>
        <template v-else-if="stage === 'search'"><strong>产能速查</strong></template>
        <template v-else-if="stage === 'broadband'"><strong>宽带一号工程专项</strong></template>
        <template v-else-if="stage === 'imports'"><strong>数据导入</strong></template>
        <template v-else-if="stage === 'scripts'"><button type="button"
            @click="returnFromScripts">预警监控</button><span>›</span><strong>经典话术库</strong></template>
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
        <button type="button" class="app-level-back" aria-label="返回上一级" @click="browserNavigation.back()"><span aria-hidden="true">‹</span> 返回</button>
      </nav>

      <template v-if="stage === 'workbench'">
        <section class="workbench-heading">
          <h2>工作台</h2><button type="button" class="workbench-logout" :disabled="logoutBusy" @click="handleLogout" aria-label="退出登录"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5m5-12 4 4-4 4m-7-4h11"/></svg>{{ logoutBusy ? '登出中…' : '登出' }}</button>
        </section>
        <section class="workbench-menu" aria-label="工作台菜单">
          <button type="button" @click="openBroadband"><span class="menu-icon menu-icon-blue"><i class="broadband-icon" :style="broadbandIconStyle" aria-hidden="true"></i></span><span class="menu-copy"><strong>宽带一号工程专项</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
          <button type="button" @click="goOverview"><span class="menu-icon menu-icon-blue"><i
                class="menu-glyph menu-glyph-overview" aria-hidden="true"></i></span><span
              class="menu-copy"><strong>生产总览</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
          <button type="button" @click="openSearch"><span class="menu-icon menu-icon-green"><i
                class="menu-glyph menu-glyph-search" aria-hidden="true"></i></span><span
              class="menu-copy"><strong>产能速查</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
          <button type="button" @click="openMonitor"><span class="menu-icon menu-icon-green"><i
                class="menu-glyph menu-glyph-alert" aria-hidden="true"></i></span><span
              class="menu-copy"><strong>预警监控</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
          <button v-if="user.isSuperAdmin" type="button" @click="openImports"><span class="menu-icon menu-icon-blue"><i class="data-import-icon" :style="dataImportIconStyle" aria-hidden="true"></i></span><span class="menu-copy"><strong>数据导入</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
        </section>
      </template>

      <template v-else-if="stage === 'imports' && user.isSuperAdmin">
        <header class="drill-page-title"><h2>数据导入</h2><p>{{ scopeName }}</p></header>

        <section class="import-legend" aria-label="图标说明">
          <span><i class="action-icon download-icon" aria-hidden="true"></i>下载模板</span>
          <span><i class="action-icon upload-icon" aria-hidden="true"></i>导入数据</span>
        </section>

        <section class="import-navigation" aria-label="数据导入导航">
          <template v-for="group in importConfig" :key="group.title">
            <template v-if="group.show">
              <h3>{{ group.title }}</h3>
              <div v-for="item in group.items.filter(i => !i.hidden)" :key="item.key" class="import-nav-item">
                <div class="import-nav-label">
                  <span class="menu-icon" :class="`menu-icon-${item.color}`">{{ item.icon }}</span>
                  <span class="menu-copy"><strong>{{ item.label }}</strong></span>
                </div>
                <div class="target-actions">
                  <!-- 下载模板按钮 -->
                  <button type="button" class="icon-action" :disabled="loading || !templateGetters[item.key]" title="下载模板" @click="handleDownloadTemplate(item)">
                    <span class="action-icon download-icon" aria-hidden="true"></span>
                  </button>
                  <!-- 导入数据按钮 -->
                  <button type="button" class="icon-action" :disabled="loading || !item.parse" title="导入数据" @click="triggerImport(item)">
                    <span class="action-icon upload-icon" aria-hidden="true"></span>
                  </button>
                </div>
              </div>
            </template>
          </template>
        </section>
      </template>

      <template v-else-if="stage === 'overview'">
        <section class="overview-heading overview-intro-card">
          <div class="overview-intro-copy">
            <h2>生产总览</h2><span class="overview-intro-scope"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0z"/><circle cx="12" cy="10" r="2.5"/></svg>{{ scopeName }} · {{ overviewLabel }}</span>
          </div>
          <ChannelTypeFilter v-model="selectedChannelType" @update:model-value="selectedChannel = ''" />
          <div class="overview-source-tags"><span class="overview-source-capacity"><svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0M4 18c0 4 16 4 16 0"/></svg>产能 · 系统取数</span><span v-if="!selectedChannelType" class="overview-source-target"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="13" r="9"/><circle cx="11" cy="13" r="5"/><path d="m11 13 9-10m-5 0h5v5"/></svg>目标 · 市公司导入</span></div>
        </section>
        <ProductionBoard v-model:period="overviewPeriod" :items="overview" :scope="scopeName" :stat-date="dashboard.statDate" :demo="isMock"
          :show-targets="!selectedChannelType" @open="openProduct" />

        <!-- AI 分析结果 -->
        <section v-if="aiAnalysis.loading || aiAnalysis.error || aiAnswerOverview" class="ai-analysis-card">
          <header class="ai-analysis-head">
            <h3>AI 经营分析</h3>
            <span v-if="aiUpdatedAtOverview">更新于 {{ formatTime(aiUpdatedAtOverview) }}</span>
          </header>
          <p v-if="aiAnalysis.loading" class="ai-analysis-hint">加载中...</p>
          <p v-else-if="aiAnalysis.error" class="ai-analysis-error">{{ aiAnalysis.error }}</p>
          <AiAnalysisContent v-else :answer="aiAnswerOverview" :demo="isMock" />
        </section>

        <section class="product-section">
          <div class="section-head">
            <h2>{{ selectedChannelType ? '产能表现' : '产能与目标' }}</h2><span>{{ user.role === 'grid' ? '点击查看预警' : '点击指标查看下级'
            }}</span>
          </div>
          <p class="production-cutoff">数据截止 {{ dashboard.statDate }}<span v-if="isMock"> · 演示数据</span></p>
          <CapacityCard :show-targets="!selectedChannelType" v-for="item in overview" :key="item.productId"
            :title="item.productName" :item="item" :unit="item.unit" :product-id="item.productId" :stat-date="dashboard.statDate"
            :icon="productIcon(item.productId)" @open="openProduct(item.productId)" />
        </section>
      </template>

      <template v-else-if="stage === 'branches'">
        <header class="drill-page-title production-drill-title">
          <h2>{{ selectedProduct?.productName }}产能</h2>
          <p>全市 · 分公司</p>
          <ChannelTypeFilter v-model="selectedChannelType" @update:model-value="selectedChannel = ''" />
        </header>
        <p class="production-cutoff">数据截止 {{ dashboard.statDate }}<span v-if="isMock"> · 演示数据</span></p>
        <CapacityCard :show-targets="!selectedChannelType" :title="'全市' + selectedProduct?.productName"
          :item="cityMetric" :unit="selectedProduct?.unit" :product-id="selectedProductId" :stat-date="dashboard.statDate"
          :icon="productIcon(selectedProductId)" :clickable="false" />
        <section class="drill-list">
          <div class="section-head">
            <h2>分公司产能</h2><span>{{ branchMetrics.length }} 个</span>
          </div>
          <CapacityCard :show-targets="!selectedChannelType" v-for="item in branchMetrics" :key="item.branchId"
            :title="item.branchName" :item="item" :unit="selectedProduct?.unit" :product-id="selectedProductId" :stat-date="dashboard.statDate"
            @open="openBranch(item.branchId)" />
        </section>
      </template>

      <template v-else-if="stage === 'grids'">
        <header class="drill-page-title production-drill-title">
          <h2>{{ selectedProduct?.productName }}产能</h2>
          <p>{{ selectedBranch?.branchName }} · 网格</p>
          <ChannelTypeFilter v-model="selectedChannelType" @update:model-value="selectedChannel = ''" />
        </header>
        <p class="production-cutoff">数据截止 {{ dashboard.statDate }}<span v-if="isMock"> · 演示数据</span></p>

        <!-- 分公司 AI 分析 -->
        <section v-if="aiAnalysis.loading || aiAnalysis.error || aiAnswerBranch" class="ai-analysis-card">
          <header class="ai-analysis-head">
            <h3>AI 经营分析 · {{ selectedBranch?.branchName }}</h3>
            <span v-if="aiUpdatedAtBranch">更新于 {{  formatTime(aiUpdatedAtBranch) }}</span>
          </header>
          <p v-if="aiAnalysis.loading" class="ai-analysis-hint">加载中...</p>
          <p v-else-if="aiAnalysis.error" class="ai-analysis-error">{{ aiAnalysis.error }}</p>
          <AiAnalysisContent v-else :answer="aiAnswerBranch" :demo="isMock" />
        </section>

        <CapacityCard :show-targets="!selectedChannelType"
          :title="selectedBranch?.branchName + selectedProduct?.productName" :item="branchMetric"
          :unit="selectedProduct?.unit" :product-id="selectedProductId" :stat-date="dashboard.statDate" :icon="productIcon(selectedProductId)"
          :clickable="false" />
        <section class="drill-list">
          <div class="section-head">
            <h2>网格产能</h2><span>{{ gridMetrics.length }} 个</span>
          </div>
          <CapacityCard :show-targets="!selectedChannelType" v-for="item in gridMetrics" :key="item.gridId"
            :title="item.gridName" :item="item" :unit="selectedProduct?.unit" :product-id="selectedProductId" :stat-date="dashboard.statDate"
            @open="openGrid(item.gridId)" />
        </section>
      </template>

      <template v-else-if="stage === 'warnings'">
        <header class="warning-page-heading"><div><h2>预警监控</h2><p>低产预警 / 异动预警</p></div><span class="warning-heading-scope"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0z"/><circle cx="12" cy="10" r="2.5"/></svg>{{ scopeName }}</span><div class="warning-heading-source"><span><svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0M4 18c0 4 16 4 16 0"/></svg>产能 · 系统取数</span></div></header>
        <div class="workbench-menu warning-menu">
          <button type="button" @click="openAlertMonitor('low')"><span class="menu-icon menu-icon-green"><i class="warning-entry-icon" :style="warningIcons.low" aria-hidden="true"></i></span><span class="menu-copy"><strong>低产预警</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
          <button type="button" @click="openAlertMonitor('change')"><span class="menu-icon menu-icon-blue"><i class="warning-entry-icon" :style="warningIcons.change" aria-hidden="true"></i></span><span class="menu-copy"><strong>异动预警</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
        </div>
      </template>

      <template v-else-if="stage === 'monitor' || stage === 'alerts'">
        <section class="alert-heading">
          <h2>{{ isChangeAlert ? '异动预警' : '低产预警' }}</h2><span>{{ stage === 'monitor' ? monitorScopeLabel :
            selectedGrid?.gridName }} · {{ roleLabel }}</span>
        </section>

        <!-- 网格 AI 分析（仅 stage=alerts 时显示） -->
        <section v-if="stage === 'alerts' && (aiAnalysis.loading || aiAnalysis.error || aiAnswerGrid)" class="ai-analysis-card">
          <header class="ai-analysis-head">
            <h3>AI 经营分析 · {{ selectedGrid?.gridName }}</h3>
            <span v-if="aiUpdatedAtGrid">更新于 {{  formatTime(aiUpdatedAtGrid) }}</span>
          </header>
          <p v-if="aiAnalysis.loading" class="ai-analysis-hint">加载中...</p>
          <p v-else-if="aiAnalysis.error" class="ai-analysis-error">{{ aiAnalysis.error }}</p>
          <AiAnalysisContent v-else :answer="aiAnswerGrid" :demo="isMock" />
        </section>

        <section class="filter-card">
          <div class="monitor-filters">
            <label v-if="stage === 'monitor' && user.role === 'city'" class="monitor-filter">分公司<select
                v-model="monitorBranchId" @change="onMonitorBranchChange">
                <option value="">全市</option>
                <option v-for="branch in monitorBranches" :key="branch.branchId"
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
            <div v-if="!isChangeAlert" class="threshold-control"><span>低产阈值</span>
              <div><button type="button" aria-label="降低阈值" @click="adjustThreshold(-1)">−</button><input
                  v-model.number="threshold" type="number" min="0" :step="thresholdStep" aria-label="低产阈值" /><button
                  type="button" aria-label="提高阈值" @click="adjustThreshold(1)">+</button></div>
            </div>
            <label v-if="!isChangeAlert" class="period-field"><span>统计周期</span><select v-model="alertPeriod" aria-label="预警统计周期">
                <option value="month">本月</option>
                <option value="day">当日</option>
              </select></label>
            <label v-if="isChangeAlert" class="monitor-filter">日均减少率（%）<input v-model.number="declineRate" type="number" min="0" max="100" step="1" aria-label="日均减少率" /></label>
            <label v-if="isChangeAlert" class="monitor-filter">日均减少值（{{ activeProduct?.unit }}/日）<input v-model.number="declineValue" type="number" min="0" step="0.1" aria-label="日均减少值" /></label>
            <div v-if="isChangeAlert" class="monitor-readonly"><span>统计周期</span><strong>本月与上月同期</strong></div>
          </div>
          <label v-if="stage === 'alerts'" class="channel-filter">渠道<select v-model="selectedChannel">
              <option value="">全部渠道</option>
              <option v-for="channel in channelOptions" :key="channel" :value="channel">{{ channel }}</option>
            </select></label>
          <div class="filter-footer"><small v-if="isChangeAlert">日均下降 ≥ {{ declineRate }}%，且减少 ≥ {{ declineValue }} {{ activeProduct?.unit }}/日</small><small v-else>{{ tab === 'people' ? '直销人员' : '渠道合计' }}产能 ≤ {{ cleanThreshold }} {{
            activeProduct?.unit }}，0 为零产</small><div class="filter-actions"><button type="button" @click="applyFilters">筛选</button><button type="button" class="alert-export" :disabled="!alertResult || alertLoading || loading || exportBusy" title="导出当前筛选条件下全部预警分类" @click="exportAlerts"><i class="export-alert-icon" :style="exportIconStyle" aria-hidden="true"></i>{{ exportBusy ? '导出中' : '导出Excel' }}</button></div></div>
        </section>
        <p v-if="alertLoading" aria-live="polite">正在查询预警...</p>
        <p v-if="alertError" role="alert">{{ alertError }}</p>
        <template v-if="alertResult">
          <section class="alert-overview" aria-label="预警概览">
            <header class="alert-overview-heading"><h3>预警概览</h3><span>当前筛选范围</span></header>
            <div class="alert-summary">
              <article v-for="category in alertCategories" :key="category.id" class="alert-overview-card" :class="{'has-warning':category.count>0}">
                <header><span class="alert-overview-icon" :class="'icon-'+category.id" aria-hidden="true"><svg viewBox="0 0 24 24"><template v-if="category.id==='people'"><circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m1-17a4 4 0 0 1 0 8m1 3a6 6 0 0 1 4 6"/></template><template v-else-if="category.id==='stars'"><path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></template><template v-else><path d="M3 10v11h18V10M2 4h20l-2 6a3 3 0 0 1-5 0 3 3 0 0 1-6 0 3 3 0 0 1-5 0zM9 21v-7h6v7"/></template></svg></span><div><h4>{{ category.id==='people'?'直销队伍':category.label }}</h4><p>总规模 {{ category.total === null ? '—' : displayNumber(category.total) }}{{ category.id==='people'?'人':'个' }}</p></div></header>
                <div class="alert-overview-main"><span>{{ isChangeAlert?'异动预警':'低产预警' }}</span><strong>{{ category.count }}<small>{{ category.id==='people'?'人':'个' }}</small></strong></div>
                <footer><span>预警率</span><strong>{{ category.rate === null ? '—' : category.rate+'%' }}</strong></footer>
              </article>
            </div>
          </section>
          <div class="tabs alert-category-tabs" role="tablist" aria-label="预警分类"><button
              v-for="category in alertCategories" :key="category.id" type="button" role="tab"
              :aria-selected="tab === category.id" :class="{ active: tab === category.id }"
              @click="selectAlertCategory(category.id)">{{ category.label }}</button></div>
          <section v-if="tab === 'people'" class="list-section">
            <article v-for="item in lowPeople" :key="`${item.gridId}-${item.staffId}`" class="person-card"
              :data-category="normalizeChannelType(item.channelType)" :class="{ zero: item.production === 0 }"><span
                class="person-avatar" aria-hidden="true"></span>
              <div class="person-main"><strong>{{ item.staffName }}</strong><span class="person-category">{{
                item.staffRole || '岗位未提供' }} · {{ item.staffId || '员工编号未提供' }}</span><span
                  class="alert-organization">{{ branchName(item.branchId) }} · {{ gridName(item.gridId) || '网格未提供'
                  }}</span></div>
              <div class="person-score"><strong>{{ displayNumber(item.production) }}</strong><span>{{
                activeProduct?.unit }}</span></div>
              <p>{{ isChangeAlert ? '异动' : item.production === 0 ? '零产' : '低产' }}</p>
              <div v-if="isChangeAlert" class="change-comparison"><span>上月同期日均 {{ displayNumber(item.previousAverage) }} · 本月日均 {{ displayNumber(item.monthAverage) }} {{ activeProduct?.unit }}/日</span><strong>-{{ displayNumber(item.declineValue) }} {{ activeProduct?.unit }}/日（-{{ displayNumber(item.declineRate) }}%）</strong></div>
            </article>
            <p v-if="!lowPeople.length" class="empty-state">当前条件下暂无{{ isChangeAlert ? '异动' : '低产' }}人员</p>
          </section>
          <section v-else class="list-section">
            <article v-for="item in displayedChannels"
              :key="`${item.gridId}-${item.channelCode || item.channel}-${item.channelType}`" class="person-card channel-warning-card"
              :data-category="item.channelType" :class="{ zero: item.production === 0 }">
              <span class="channel-warning-avatar" :style="channelWarningIconStyle" aria-hidden="true"></span>
              <div class="person-main"><strong>{{ tab === 'tail' ? item.microChannelName || item.channel : item.channel }}</strong>
                <span class="person-category">{{ tab === 'halls' ? '营业厅' : tab === 'stars' ? (item.channelStar ? item.channelStar + '星' : '星级未提供') : item.serviceProvider || '区域服务商未提供' }}<template v-if="tab !== 'tail'"> · {{ item.channelCode || '渠道编码未提供' }}</template></span>
                <span class="alert-organization">{{ branchName(item.branchId) }} · {{ gridName(item.gridId) || '网格未提供' }}</span>
                <span v-if="tab === 'tail' &amp;&amp; item.staffCount != null" class="channel-member-count">人员规模 {{ item.staffCount }} 人</span>
              </div>
              <div class="person-score"><strong>{{ displayNumber(item.production) }}</strong><span>{{ activeProduct?.unit }}</span></div>
              <p>{{ isChangeAlert ? '异动' : item.production === 0 ? '零产' : '低产' }}</p>
              <div v-if="isChangeAlert" class="change-comparison"><span>上月同期日均 {{ displayNumber(item.previousAverage) }} · 本月日均 {{ displayNumber(item.monthAverage) }} {{ activeProduct?.unit }}/日</span><strong>-{{ displayNumber(item.declineValue) }} {{ activeProduct?.unit }}/日（-{{ displayNumber(item.declineRate) }}%）</strong></div>
            </article>
            <p v-if="!displayedChannels.length" class="empty-state">当前条件下暂无{{ isChangeAlert ? '异动' : '低产' }}渠道</p>
          </section>
        </template>
        <button v-if="showSalesScriptLibrary" class="script-library-entry" type="button" @click="openScriptLibrary"><span class="script-library-icon"
            aria-hidden="true"></span><span><strong>经典话术库</strong><small>产品话术 · 沟通参考</small></span><i
            class="menu-chevron" aria-hidden="true"></i></button>
      </template>

      <template v-else-if="stage === 'scripts' && showSalesScriptLibrary">
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
        <CapacitySearch :dashboard="dashboard" :grid-ids="scopeGridIds" :scope="scopeName" :demo="isMock"
          :query-api="searchQuery" />
      </template>

      <template v-else-if="stage === 'campus'">
        <CampusAnalysis :phone="user.phone" :token="token" />
      </template>

      <template v-else-if="stage === 'broadband'">
        <BroadbandAnalysis :navigation-state="broadbandNavigation" @navigation-change="broadbandNavigation = $event" @back-to-workbench="goWorkbench" :permission="user" :organization="dashboard.organization" :stat-date="dashboard.statDate" :scope="scopeName" :token="token" />
      </template>

      <nav v-if="stage !== 'workbench'" class="bottom-nav" aria-label="主导航"><button type="button"
          :class="{ active: ['campus', 'broadband'].includes(stage) }" @click="goWorkbench"><i class="bottom-icon bottom-home"
            aria-hidden="true"></i><span>工作台</span></button><button type="button"
          :class="{ active: ['overview', 'branches', 'grids'].includes(stage) }" @click="goOverview"><i
            class="bottom-icon bottom-overview" aria-hidden="true"></i><span>生产总览</span></button><button type="button"
          :class="{ active: ['warnings', 'monitor', 'alerts'].includes(stage) }" @click="openMonitor"><i
            class="bottom-icon bottom-alert" aria-hidden="true"></i><span>预警监控</span></button></nav>
    </main>

    <main v-if="loading" class="loading-mask"><span class="loading-spinner"></span><span>加载中...</span></main>
    <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>

    <!-- 全局唯一的文件上传组件 -->
    <input ref="unifiedFileInput" type="file" accept=".xlsx,.xls,.csv" hidden @change="handleUnifiedFileChange" />

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
import { computed, nextTick, onMounted, onUnmounted, provide, reactive, ref, watch } from 'vue'
import {createBrowserNavigation} from './utils/browserNavigation.js'
import {installSwipeBack} from './utils/swipeBack.js'
import {createSessionPersistence,isExpiredSessionError} from './utils/sessionPersistence.js'
import lowWarningIcon from './assets/warning-icons/triangle-alert.svg'
import changeWarningIcon from './assets/warning-icons/chart-no-axes-combined.svg'
import broadbandIcon from './assets/product-icons/wifi.svg'
import { isMock } from './api/client'
import { sendLoginCode, loginWithCode, loginWithOneClick, logoutSession, loginWithWechatCode } from './api/auth.js'
import { fetchChannelOptions, fetchChangeAlerts, fetchDashboard, fetchPermission, getMobileByToken, fetchAlerts, queryCapacity, importCapacity, importRows, importTargets, saveSalesScript, importSalesScripts, fetchAiAnalysis } from './api/production'
import { monitorBranchOptions } from './utils/monitorBranches.js'
import ChannelTypeFilter from './components/ChannelTypeFilter.vue'
import BroadbandAnalysis from './components/BroadbandAnalysis.vue'
import { normalizeChannelType } from './utils/channelTypes.js'
import CapacityCard from './components/CapacityCard.vue'
import SalesScriptPanel from './components/SalesScriptPanel.vue'
import ProductionBoard from './components/ProductionBoard.vue'
import BrandHeading from './components/BrandHeading.vue'
import AiAnalysisContent from './components/AiAnalysisContent.vue'
import CampusAnalysis from './components/CampusAnalysis.vue'
import { buildAlertExport, createAlertWorkbook } from './utils/alertExport.js'
import downloadIcon from './assets/action-icons/download.svg'
import uploadIcon from './assets/action-icons/upload.svg'
import channelWarningIcon from './assets/ui-icons/store.svg'
import CapacitySearch from './components/CapacitySearch.vue'
import { buildCapacityMetric } from './utils/capacityMetrics.js'
import { parseCsv, parseExcelFile, normalizeCapacityRows, downloadCsv, ensureXlsx } from './utils/imports/helpers.js'
import { channelInfoRows, channelInfoTemplateCsv } from './utils/imports/channelInfo.js'
import { terminalInfoRows, terminalInfoTemplateCsv } from './utils/imports/terminalInfo.js'
import { staffInfoRows, staffInfoTemplateCsv } from './utils/imports/staffInfo.js'
import { staffBroadbandRows, staffBroadbandTemplateCsv, staffCategoryRows, staffCategoryTemplateCsv, areaContractorRows, areaContractorTemplateCsv } from './utils/imports/monthlyTargets.js'
import { regionCapacityRows, regionCapacityTemplateCsv } from './utils/imports/regionCapacity.js'
import { channelCapacityRows, channelCapacityTemplateCsv } from './utils/imports/channelCapacity.js'
import { staffCapacityRows, staffCapacityTemplateCsv } from './utils/imports/staffCapacity.js'
import { permissionRows, permissionTemplateCsv } from './utils/imports/permission.js'
import { validateScriptImport, scriptTemplateCsv } from './utils/imports/salesScript.js'
import { parseTargetFile, targetTemplateCsv } from './utils/imports/targets.js'
import { staffOwnRows, staffOwnTemplateCsv } from './utils/imports/staffOwn.js'

// ==================== 图标与样式 ====================
const warningIcons = {
  low: { '--warning-icon': `url(${JSON.stringify(lowWarningIcon)})` },
  change: { '--warning-icon': `url(${JSON.stringify(changeWarningIcon)})` }
}
const exportIconStyle = { '--export-icon': `url(${JSON.stringify(downloadIcon)})` }
const broadbandIconStyle = { '--broadband-icon': `url("${broadbandIcon}")` }
const channelWarningIconStyle = { '--channel-warning-icon': `url("${channelWarningIcon}")` }
const dataImportIconStyle = { '--import-icon': `url(${JSON.stringify(uploadIcon)})` }

// ==================== 全局状态 ====================
const exportBusy = ref(false)
const alertSnapshot = ref(null)
const overviewPeriod = ref('month')
const page = ref('login')
const sessionChecking=ref(true),logoutBusy=ref(false)
let sessionVersion=0,sessionValidation=null
let persistentStorage=null
try{persistentStorage=window.localStorage}catch{/* Browsers may forbid persistence. */}
const sessionStore=createSessionPersistence(persistentStorage,['wgsc-session-v1',import.meta.env.VITE_APP_ID||'',import.meta.env.VITE_ACTIVITY_ID||'',isMock?'mock':'real'].join(':'))
const cancelledSession=()=>Object.assign(new Error('登录状态已变化'),{cancelled:true})
const stage = ref('workbench')
const loading = ref(false)
const token = ref('')
const loginPhone = ref('')
const loginCode = ref('')
const codeSending = ref(false)
const codeCountdown = ref(0)
const authFeedback = ref('')
let codeTimer
const agreedToTerms = ref(false)
const user = reactive({ name: '', phone: '', role: '', branchId: '', branchName: '', gridId: '', gridName: '', cityName: '', isSuperAdmin: false })
const dashboard = reactive({ organization: { cityName: '', branches: [], grids: [] }, statDate: '', products: [], targets: [], rows: [], dailyRows: [], salesScripts: [] })
const selectedProductId = ref('')
const selectedBranchId = ref('')
const selectedGridId = ref('')
const alertMode = ref('low')
const declineRate = ref(30)
const declineValue = ref(5)
const isChangeAlert = computed(() => stage.value === 'monitor' && alertMode.value === 'change')
const monitorBranchId = ref('')
const monitorGridId = ref('')
const monitorProductId = ref('')
const selectedChannel = ref('')
const selectedChannelType = ref('')
const threshold = ref(1)
const alertPeriod = ref('month')
const tab = ref('people')
const toast = reactive({ show: false, type: 'success', message: '' })
const importErrorVisible = ref(false)
const importErrorTitle = ref('')
const importErrorList = ref([])
const alertResult = ref(null)
const alertLoading = ref(false), alertError = ref('')
let alertSequence = 0

// ==================== 数据导入配置中心 ====================
const importConfig = [
  {
    title: '权限',
    items: [
      { key: 'permission', label: '人员权限表', icon: '人', color: 'green', parse: permissionRows }
    ],
    show: true
  },
  {
    title: '基础资料',
    items: [
      { key: 'channelInfo', label: '渠道维度', icon: '渠', color: 'blue', parse: channelInfoRows },
      { key: 'terminal', label: '末梢维度', icon: '末', color: 'blue', parse: terminalInfoRows },
      { key: 'areaContractor', label: '包片商维度', icon: '商', color: 'blue', parse: areaContractorRows },
      { key: 'staff', label: '自控团队工号', icon: '控', color: 'blue', parse: staffInfoRows },
      { key: 'staffOwn', label: '自有团队工号', icon: '有', color: 'blue', parse: staffOwnRows }
    ],
    show: true
  },
  {
    title: '产能数据',
    items: [
      { key: 'region', label: '区域产能', icon: '区', color: 'green', parse: regionCapacityRows, isCapacity: true },
      { key: 'channel', label: '渠道产能', icon: '渠', color: 'green', parse: channelCapacityRows, isCapacity: true },
      { key: 'staffCapacity', label: '工号产能', icon: '工', color: 'green', parse: staffCapacityRows, isCapacity: true }
    ],
     show: false
  },
  {
    title: '目标管理',
    items: [
      { key: 'target', label: '产品目标', icon: '产', color: 'yellow', parse: 'target' },
      { key: 'staffBroadbandTarget', label: '营业员终端员-手宽月度目标', icon: '营', color: 'yellow', parse: staffBroadbandRows },
      { key: 'staffCategoryTarget', label: '人员分类月度目标', icon: '员', color: 'yellow', parse: staffCategoryRows },
      { key: 'script', label: '经典话术', icon: '术', color: 'yellow', parse: 'script', hidden: !showSalesScriptLibrary }
    ],
     show: true
  }
]

const templateGetters = {
  permission: () => ['人员权限表导入模板.csv', permissionTemplateCsv()],
  channelInfo: () => ['渠道维度表导入模板.csv', channelInfoTemplateCsv()],
  terminal: () => ['末梢维度表导入模板.csv', terminalInfoTemplateCsv()],
  staff: () => ['自控团队工号表导入模板.csv', staffInfoTemplateCsv()],
  staffOwn: () => ['自有团队工号表导入模板.csv', staffOwnTemplateCsv()],
  areaContractor: () => ['包片商维度表导入模板.csv', areaContractorTemplateCsv()],
  region: () => ['区域汇总产能表导入模板.csv', regionCapacityTemplateCsv()],
  channel: () => ['渠道汇总产能表导入模板.csv', channelCapacityTemplateCsv()],
  staffCapacity: () => ['工号汇总产能表导入模板.csv', staffCapacityTemplateCsv()],
  target: () => ['产能目标表导入模板.csv', targetTemplateCsv(dashboard)],
  staffBroadbandTarget: () => ['营业员终端员-手宽月度目标表导入模板.csv', staffBroadbandTemplateCsv()],
  staffCategoryTarget: () => ['人员分类月度目标表导入模板.csv', staffCategoryTemplateCsv()],
  script: () => ['产品经典话术表导入模板.csv', scriptTemplateCsv(dashboard.products)]
}

const unifiedFileInput = ref(null)
const currentImportKey = ref('')

function handleDownloadTemplate(item) {
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可下载模板', 'warning')
  const getter = templateGetters[item.key]
  if (!getter) return showToast('该模板暂未提供下载', 'warning')
  try {
    const [filename, csvContent] = getter()
    downloadCsv(csvContent, filename)
  } catch (err) {
    showToast(err.message || '模板下载失败', 'error')
  }
}

function triggerImport(item) {
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可导入', 'warning')
  if (!item.parse) return showToast('该功能正在开发中', 'warning')
  currentImportKey.value = item.key
  if (unifiedFileInput.value) {
    unifiedFileInput.value.value = ''
    unifiedFileInput.value.click()
  }
}

async function handleUnifiedFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const group = importConfig.find(g => g.items.some(i => i.key === currentImportKey.value))
  const item = group?.items.find(i => i.key === currentImportKey.value)
  if (!item) return

  if (item.key === 'target') return handleTargetFile(event)
  if (item.key === 'script') return handleScriptFile(event)
  if (loading.value) return
  if (file.size > 5 * 1024 * 1024) return showToast('文件过大，请控制在 5MB 以内', 'warning')
  
  loading.value = true
  try {
    const data = await parseExcelFile(file)
    let rows = item.parse(data)
    if (item.isCapacity) {
      rows = normalizeCapacityRows(rows)
      const result = await importCapacity(item.key, rows, token.value)
      await refreshAfterImport()
      handleImportResult(result)
    } else {
      const result = await importRows(item.key, rows, token.value, user)
      await refreshAfterImport()
      handleImportResult(result)
    }
  } catch (error) {
    showToast(error.message || `${item.label}导入失败`, 'error')
  } finally {
    loading.value = false
  }
}

function handleImportResult(result) {
  if (result?.failed > 0) {
    showToast(`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`, 'warning')
    showImportErrors(`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`, result.errors || [])
  } else {
    showToast(`导入成功，共 ${result.success} 条`)
  }
}

// ==================== 其他逻辑 ====================
const showSalesScriptLibrary = false
const scriptFileInput = ref(null)
const targetFileInput = ref(null)
const scriptProductId = ref('')
const scriptReturnStage = ref('monitor')

const scopeName = computed(() => user.role === 'city' ? dashboard.organization.cityName : user.role === 'grid' ? user.gridName : user.branchName)
const roleLabel = computed(() => user.isSuperAdmin === true ? '超级管理员' : ({ city: '市公司', branch: '分公司', grid: '网格长' })[user.role] || '')
const overviewLabel = computed(() => ({ city: '全市生产总览', branch: '分公司生产总览', grid: '网格生产总览' })[user.role] || '生产总览')
const selectedProduct = computed(() => dashboard.products.find(item => item.productId === selectedProductId.value))
const activeProduct = computed(() => dashboard.products.find(item => item.productId === (stage.value === 'monitor' ? monitorProductId.value : selectedProductId.value)))
const libraryScript = computed(() => dashboard.salesScripts.find(item => item.productId === scriptProductId.value))
const libraryProduct = computed(() => dashboard.products.find(item => item.productId === scriptProductId.value))
const selectedBranch = computed(() => dashboard.organization.branches.find(item => item.branchId === selectedBranchId.value))
const selectedGrid = computed(() => dashboard.organization.grids.find(item => item.gridId === selectedGridId.value))
const thresholdStep = computed(() => activeProduct.value?.productId === 'terminal' ? 0.1 : 1)
const cleanThreshold = computed(() => {
  const value = Math.max(0, Number(threshold.value) || 0)
  return Math.round(Math.floor(value / thresholdStep.value + 1e-9) * thresholdStep.value * 10) / 10
})

function aiScopeKey(type, id, channel = '') { 
  const c = channel || '全部类型'
  return `${type}::${id}::${c}` 
}
function aiEntry(type, id) { 
  const currentType = selectedChannelType.value || '全部类型'
  return aiAnalysis.byScope[aiScopeKey(type, id, currentType)] || null 
}
const aiAnalysis = reactive({ loading: false, error: '', byScope: {} })
const aiAnswerOverview = computed(() => {
  if (user.role === 'city') return aiEntry('city', '全市')?.answer || ''
  if (user.role === 'branch') return aiEntry('branch', user.branchId)?.answer || ''
  if (user.role === 'grid') return aiEntry('grid', user.gridId)?.answer || ''
  return ''
})
const aiUpdatedAtOverview = computed(() => {
  if (user.role === 'city') return aiEntry('city', '全市')?.updatedAt || ''
  if (user.role === 'branch') return aiEntry('branch', user.branchId)?.updatedAt || ''
  if (user.role === 'grid') return aiEntry('grid', user.gridId)?.updatedAt || ''
  return ''
})
const aiAnswerBranch = computed(() => selectedBranchId.value ? (aiEntry('branch', selectedBranchId.value)?.answer || '') : '')
const aiUpdatedAtBranch = computed(() => selectedBranchId.value ? (aiEntry('branch', selectedBranchId.value)?.updatedAt || '') : '')
const aiAnswerGrid = computed(() => selectedGridId.value ? (aiEntry('grid', selectedGridId.value)?.answer || '') : '')
const aiUpdatedAtGrid = computed(() => selectedGridId.value ? (aiEntry('grid', selectedGridId.value)?.updatedAt || '') : '')

async function loadAiAnalysis(statDate) {
  const requestToken=token.value,attempt=sessionVersion
  aiAnalysis.loading = true
  aiAnalysis.error = ''
  try {
    const data = await fetchAiAnalysis({ statDate, phone: user.phone, channelType: selectedChannelType.value || '' }, token.value)
    if(requestToken!==token.value || attempt!==sessionVersion)return
    const map = {}
    for (const row of (data?.rows || [])) {
      map[aiScopeKey(row.scopeType, row.scopeId, row.channelType)] = { answer: row.answer || '', updatedAt: row.updatedAt || '' }
    }
    aiAnalysis.byScope = map
  } catch (e) {
    if(requestToken===token.value && attempt===sessionVersion)aiAnalysis.error = e.message || 'AI 分析读取失败'
  } finally {
    if(requestToken===token.value && attempt===sessionVersion)aiAnalysis.loading = false
  }
}

function metric(productId, gridIds, scope = null) {
  return buildCapacityMetric(dashboard, productId, gridIds, selectedChannelType.value, scope)
}

function gridsOf(branchId) { return dashboard.organization.grids.filter(item => item.branchId === branchId).map(item => item.gridId) }
const scopeGridIds = computed(() => user.role === 'city' ? dashboard.organization.grids.map(item => item.gridId) : user.role === 'grid' ? [user.gridId] : gridsOf(user.branchId))
const overview = computed(() => dashboard.products.map(item => ({ ...item, ...metric(item.productId, scopeGridIds.value, { level: user.role, id: user.role === 'grid' ? user.gridId : user.branchId }) })))
const cityMetric = computed(() => metric(selectedProductId.value, scopeGridIds.value, { level: 'city' }))
const branchMetric = computed(() => metric(selectedProductId.value, gridsOf(selectedBranchId.value), { level: 'branch', id: selectedBranchId.value }))
const branchMetrics = computed(() => dashboard.organization.branches.map(item => ({ ...item, ...metric(selectedProductId.value, gridsOf(item.branchId), { level: ['未知', '市统筹'].includes(item.branchId) ? 'grid' : 'branch', id: ['未知', '市统筹'].includes(item.branchId) ? `${item.branchId}::${item.branchId}` : item.branchId }) })))
const gridMetrics = computed(() => dashboard.organization.grids.filter(item => item.branchId === selectedBranchId.value).map(item => ({ ...item, ...metric(selectedProductId.value, [item.gridId], { level: 'grid', id: item.gridId }) })))
const monitorBranches = computed(() => monitorBranchOptions(dashboard.organization.branches))
const monitorGrids = computed(() => dashboard.organization.grids.filter(item => !monitorBranchId.value || item.branchId === monitorBranchId.value))
const monitorGridIds = computed(() => monitorGridId.value ? [monitorGridId.value] : monitorGrids.value.map(item => item.gridId))
const monitorScopeLabel = computed(() => monitorGridId.value ? gridName(monitorGridId.value) : monitorBranchId.value ? dashboard.organization.branches.find(item => item.branchId === monitorBranchId.value)?.branchName : scopeName.value)
const channelOptions = ref([])
let channelOptionsSequence = 0
watch(() => JSON.stringify([stage.value, activeProduct.value?.productId, alertPeriod.value, stage.value === 'monitor' ? monitorGridIds.value : [selectedGridId.value], dashboard.statDate]), async () => {
  const sequence = ++channelOptionsSequence
  channelOptions.value = []
  if (!['monitor', 'alerts'].includes(stage.value) || !activeProduct.value || !token.value) return
  try {
    const data = await fetchChannelOptions({ productId: activeProduct.value.productId, period: alertPeriod.value, phone: user.phone, gridIds: stage.value === 'monitor' ? monitorGridIds.value : [selectedGridId.value] }, token.value)
    if (sequence === channelOptionsSequence) channelOptions.value = (data.channels || []).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  } catch (error) { if (sequence === channelOptionsSequence) showToast(error.message || '渠道列表读取失败', 'warning') }
})
const lowPeople = computed(() => alertResult.value?.people || [])
const lowChannels = computed(() => alertResult.value?.channels || [])

const alertCategories = computed(() => [
  { id: 'people', label: '直销人员', count: alertResult.value ? lowPeople.value.length : null },
  { id: 'halls', label: '营业厅', count: alertResult.value ? lowChannels.value.filter(item => item.channelType === '营业厅').length : null },
  { id: 'stars', label: '3星+渠道', count: alertResult.value ? lowChannels.value.filter(item => item.channelType === '三星+渠道').length : null },
  { id: 'tail', label: '末梢渠道', count: alertResult.value ? lowChannels.value.filter(item => item.channelType === '末梢渠道').length : null }
].map(category => {
  const value = alertResult.value?.totals?.[category.id]
  const total = typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
  return { ...category, total, rate: total !== null && total > 0 && category.count <= total ? Math.round(category.count / total * 1000) / 10 : null }
}))
const displayedChannels = computed(() => lowChannels.value.filter(item => item.channelType === ({ stars: '三星+渠道', tail: '末梢渠道', halls: '营业厅' })[tab.value]))
function selectAlertCategory(id) { tab.value = id; selectedChannel.value = '' }

function displayNumber(value) { return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) }
function productIcon(id) { return ({ newNumbers: 'contact', plan119: 'gift', terminal: 'smartphone', homeBroadband: 'house', gigabit: 'wifi' })[id] || 'chart-no-axes-combined' }
function gridName(id) { return dashboard.organization.grids.find(item => item.gridId === id)?.gridName || '' }
function branchName(id) { return dashboard.organization.branches.find(item => item.branchId === id)?.branchName || '分公司未提供' }
const broadbandNavigation = ref(null)
function navigationSnapshot() {
 return {stage:stage.value,product:selectedProductId.value,branch:selectedBranchId.value,grid:selectedGridId.value,
  channel:selectedChannel.value,channelType:selectedChannelType.value,tab:tab.value,alertMode:alertMode.value,
  monitorBranch:monitorBranchId.value,monitorGrid:monitorGridId.value,monitorProduct:monitorProductId.value,
  period:alertPeriod.value,threshold:threshold.value,declineRate:declineRate.value,declineValue:declineValue.value,
  overviewPeriod:overviewPeriod.value,broadband:broadbandNavigation.value}
}
function navigationKey(state) {
 if(state.stage==='broadband'){
  const b=state.broadband||{view:'overview'}
  return JSON.stringify(['broadband',b.view||'overview',b.view==='overview'?'':b.categoryId||'',b.view==='overview'?'':b.branch||'',b.view==='overview'?'':b.grid||''])
 }
 return JSON.stringify([state.stage,['branches','grids','alerts'].includes(state.stage)?state.product:'',
  ['grids','alerts'].includes(state.stage)?state.branch:'',state.stage==='alerts'?state.grid:'',state.stage==='monitor'?state.alertMode:''])
}
const browserNavigation=createBrowserNavigation({onExitHint:()=>showToast('再返回一次退出','warning'),restore:async state=>{
 if(page.value!=='dashboard')return
 if(!['workbench','overview','branches','grids','alerts','warnings','monitor','search','broadband','imports','scripts','campus'].includes(state.stage) || (state.stage==='imports' && !user.isSuperAdmin))state={stage:'workbench'}
 selectedProductId.value=state.product||'';selectedBranchId.value=state.branch||'';selectedGridId.value=state.grid||''
 selectedChannel.value=state.channel||'';selectedChannelType.value=state.channelType||'';tab.value=state.tab||'people'
 alertMode.value=state.alertMode||'low';monitorBranchId.value=state.monitorBranch||'';monitorGridId.value=state.monitorGrid||'';monitorProductId.value=state.monitorProduct||''
 alertPeriod.value=state.period||'month';threshold.value=state.threshold??1;declineRate.value=state.declineRate??30;declineValue.value=state.declineValue??5
 overviewPeriod.value=state.overviewPeriod||'month';broadbandNavigation.value=state.broadband||null;stage.value=state.stage
 await nextTick();window.scrollTo(0,0)
}})
provide('wgsc-browser-navigation',{back:()=>browserNavigation.back()})
let removeSwipeBack
onMounted(()=>{removeSwipeBack=installSwipeBack({target:document,canGoBack:()=>page.value==='dashboard' && browserNavigation.canGoBack(),back:()=>browserNavigation.back(),routeKey:()=>browserNavigation.entryKey})})
onUnmounted(()=>removeSwipeBack?.())
watch(page,value=>{
 if(value==='dashboard'){const state=navigationSnapshot();browserNavigation.start(state,navigationKey(state))}
 else browserNavigation.reset()
},{flush:'post'})
watch(()=>JSON.stringify(navigationSnapshot()),()=>{
 if(page.value==='dashboard' && !browserNavigation.restoring){const state=navigationSnapshot();browserNavigation.commit(state,navigationKey(state))}
},{flush:'post'})
onUnmounted(()=>browserNavigation.dispose())

function scrollTop() { window.scrollTo(0, 0) }
function goWorkbench() { stage.value = 'workbench'; scrollTop() }
function goOverview() { stage.value = 'overview'; selectedProductId.value = ''; selectedBranchId.value = ''; selectedGridId.value = ''; scrollTop() }
function goProduct() { stage.value = user.role === 'city' ? 'branches' : user.role === 'branch' ? 'grids' : 'overview'; selectedBranchId.value = user.role === 'city' ? '' : user.branchId; selectedGridId.value = ''; scrollTop() }
function goBranch() { stage.value = 'grids'; selectedGridId.value = ''; scrollTop() }
function openProduct(id) { selectedProductId.value = id; selectedBranchId.value = user.role === 'city' ? '' : user.branchId; selectedGridId.value = user.role === 'grid' ? user.gridId : ''; selectedChannel.value = ''; threshold.value = 1; tab.value = 'people'; stage.value = user.role === 'city' ? 'branches' : user.role === 'branch' ? 'grids' : 'alerts'; scrollTop() }
function openBranch(id) { selectedBranchId.value = id; stage.value = 'grids'; scrollTop() }
function openGrid(id) { selectedGridId.value = id; selectedChannel.value = ''; threshold.value = 1; tab.value = 'people'; stage.value = 'alerts'; scrollTop() }
function openMonitor() { stage.value = 'warnings'; scrollTop() }
function openAlertMonitor(mode) { alertMode.value = mode; monitorBranchId.value = user.role === 'city' ? '' : user.branchId; monitorGridId.value = user.role === 'grid' ? user.gridId : ''; monitorProductId.value = dashboard.products[0]?.productId || ''; selectedChannel.value = ''; threshold.value = 1; tab.value = 'people'; stage.value = 'monitor'; scrollTop() }
function openCampus() { stage.value = 'campus'; scrollTop() }
function openSearch() { stage.value = 'search'; scrollTop() }
function openBroadband() { broadbandNavigation.value=null;stage.value = 'broadband'; scrollTop() }
function openImports() { if (user.isSuperAdmin !== true) return showToast('仅超级管理员可导入数据', 'warning'); stage.value = 'imports'; scrollTop() }
function openScriptLibrary() { scriptReturnStage.value = stage.value; scriptProductId.value = activeProduct.value?.productId || dashboard.products[0]?.productId || ''; stage.value = 'scripts'; scrollTop() }
function returnFromScripts() { stage.value = scriptReturnStage.value; scrollTop() }
function onMonitorBranchChange() { monitorGridId.value = ''; selectedChannel.value = '' }
function onMonitorProductChange() { threshold.value = 1; selectedChannel.value = ''; tab.value = 'people' }
function adjustThreshold(direction) { threshold.value = Math.round((cleanThreshold.value + direction * thresholdStep.value) * 10) / 10; if (threshold.value < 0) threshold.value = 0 }
async function loadAlerts() {
  const id = ++alertSequence
  alertResult.value = null
  alertSnapshot.value = null
  alertLoading.value = false; alertError.value = ''
  if (!['monitor', 'alerts'].includes(stage.value) || !activeProduct.value) return
  alertLoading.value = true
  try {
    const params = { declineRate: declineRate.value, declineValue: declineValue.value, phone: user.phone, productId: activeProduct.value.productId, gridIds: [...(stage.value === 'monitor' ? monitorGridIds.value : [selectedGridId.value])], threshold: cleanThreshold.value, period: alertPeriod.value, channel: selectedChannel.value }
    const snapshot = { ...params, product: { ...activeProduct.value }, kind: isChangeAlert.value ? 'change' : 'low', scope: stage.value === 'monitor' ? monitorScopeLabel.value : selectedGrid.value?.gridName }
    const data = await (isChangeAlert.value ? fetchChangeAlerts : fetchAlerts)(params, token.value)
    if (id === alertSequence) { alertResult.value = data; alertSnapshot.value = snapshot }
  } catch (error) { if (id === alertSequence) { alertError.value = error.message || '预警查询失败'; showToast(alertError.value, 'error') } }
  finally { if (id === alertSequence) alertLoading.value = false }
}
watch([stage, alertMode, declineRate, declineValue, monitorBranchId, monitorGridId, monitorProductId, selectedGridId, selectedProductId, cleanThreshold, alertPeriod, selectedChannel], loadAlerts)

watch(selectedChannelType, () => {
  if (dashboard.statDate) loadAiAnalysis(dashboard.statDate)
})

async function applyFilters() { await loadAlerts(); document.querySelector('.alert-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
async function exportAlerts() {
  if (exportBusy.value || alertLoading.value || !alertResult.value || !alertSnapshot.value) return
  exportBusy.value = true
  const sequence = alertSequence, sessionToken = token.value
  try {
    const model = buildAlertExport({ data: dashboard, result: alertResult.value, product: alertSnapshot.value.product, filters: alertSnapshot.value, demo: isMock })
    await ensureXlsx()
    if (sequence !== alertSequence || sessionToken !== token.value || page.value === 'login') throw new Error('筛选或登录状态已变化，请重新导出')
    window.XLSX.writeFile(createAlertWorkbook(window.XLSX, model), model.filename, { compression: true })
    showToast(`已导出 ${model.rows.length - 1} 条预警`, 'success')
  } catch (error) { showToast(error.message || '导出失败', 'error') }
  finally { exportBusy.value = false }
}
const searchQuery = params => queryCapacity({ ...params, phone: user.phone }, token.value)

async function restoreSavedSession() {
 const attempt=++sessionVersion;sessionChecking.value=true
 const params=new URLSearchParams(location.search),callbackToken=params.get('token')||'',wechatCode=/MicroMessenger/i.test(navigator.userAgent)?params.get('code')||'':''
 const saved=sessionStore.read(),candidate=callbackToken?{token:callbackToken}:saved
 loginPhone.value=params.get('phone')||params.get('mobile')||''
 if(callbackToken || wechatCode){const url=new URL(location.href);url.searchParams.delete('token');url.searchParams.delete('phone');url.searchParams.delete('mobile');if(wechatCode){url.searchParams.delete('code');url.searchParams.delete('state')}history.replaceState(null,'',url)}
 try{
  let identity
  if(wechatCode && !isMock)identity=await loginWithWechatCode(wechatCode)
  else if(candidate?.token){
   token.value=candidate.token
   if(isMock){if(candidate.token!=='mock-token')throw Object.assign(new Error('登录已过期'),{code:'00008'});identity={token:candidate.token,mobile:candidate.mobile||loginPhone.value}}
   else identity={token:candidate.token,mobile:(await getMobileByToken(candidate.token)).mobile}
  }else return
  if(attempt!==sessionVersion)throw cancelledSession()
  await completeLogin(identity,attempt)
 }catch(error){
  if(error.cancelled || attempt!==sessionVersion)return
  token.value='';page.value='login'
  if(isExpiredSessionError(error)){sessionStore.clear();authFeedback.value='登录已过期，请重新登录'}
  else authFeedback.value=error.message||'暂时无法验证登录状态，请稍后刷新重试'
 }finally{sessionChecking.value=false}
}
function resetLocalSession(clearStored=true) {
 sessionVersion++;if(clearStored)sessionStore.clear();sessionChecking.value=false;token.value='';page.value='login';stage.value='workbench'
 loginPhone.value='';loginCode.value='';agreedToTerms.value=false;clearInterval(codeTimer);codeCountdown.value=0
 alertSequence++;alertResult.value=null;alertSnapshot.value=null;alertLoading.value=false;alertError.value=''
 aiAnalysis.byScope={};aiAnalysis.error='';aiAnalysis.loading=false
 selectedProductId.value='';selectedBranchId.value='';selectedGridId.value='';selectedChannel.value='';selectedChannelType.value='';broadbandNavigation.value=null
 Object.assign(user,{name:'',phone:'',role:'',branchId:'',branchName:'',gridId:'',gridName:'',cityName:'',isSuperAdmin:false})
 Object.assign(dashboard,{organization:{cityName:'',branches:[],grids:[]},statDate:'',rows:[],dailyRows:[],targets:[],products:[],regionRows:undefined,periodRows:[],salesScripts:[]})
}
function expireSession(event) {
 if(event?.requestToken && event.requestToken!==token.value)return
 resetLocalSession();showToast('登录已过期，请重新认证','warning')
}
async function handleLogout() {
 if(logoutBusy.value)return
 const currentToken=token.value;logoutBusy.value=true;resetLocalSession();sessionChecking.value=true
 try{await logoutSession(currentToken);showToast('已登出','success')}
 catch(error){showToast(isExpiredSessionError(error)?'已登出':'本机已登出，平台注销暂未确认','warning')}
 finally{logoutBusy.value=false;sessionChecking.value=false}
}
async function validateVisibleSession() {
 if(document.visibilityState==='hidden' || page.value!=='dashboard' || !token.value || sessionValidation)return
 const currentToken=token.value,attempt=sessionVersion
 sessionValidation=(async()=>{try{
  if(!isMock)await getMobileByToken(currentToken)
  const saved=sessionStore.read();if(persistentStorage && (!saved || saved.token!==currentToken)){if(attempt===sessionVersion)resetLocalSession(false)}
 }catch(error){if(attempt===sessionVersion && isExpiredSessionError(error))expireSession({requestToken:currentToken})}finally{sessionValidation=null}})()
 await sessionValidation
}
function onSessionStorage(event){if(event.key===sessionStore.key && !event.newValue && page.value==='dashboard')resetLocalSession(false)}
function onPageShow(event){if(event.persisted)validateVisibleSession()}
onMounted(async()=>{window.addEventListener('handle2-auth-expired',expireSession);window.addEventListener('storage',onSessionStorage);window.addEventListener('pageshow',onPageShow);document.addEventListener('visibilitychange',validateVisibleSession);await restoreSavedSession()})
onUnmounted(()=>{window.removeEventListener('handle2-auth-expired',expireSession);window.removeEventListener('storage',onSessionStorage);window.removeEventListener('pageshow',onPageShow);document.removeEventListener('visibilitychange',validateVisibleSession);clearInterval(codeTimer)})
watch(loginPhone,()=>{authFeedback.value='';loginCode.value=''})

async function handleLogin() {
  if (loading.value || codeSending.value) return
  if (!agreedToTerms.value) return showToast('请先同意登录协议', 'warning')
  if (!/^1\d{10}$/.test(loginPhone.value)) return showToast('请输入正确的11位手机号', 'warning')
  loading.value = true
  authFeedback.value = ''
  try {
    const phone = loginPhone.value
    let identity
    if (token.value && !isMock) {
      identity = { mobile: (await getMobileByToken(token.value)).mobile, token: token.value }
    }
    else {
      identity = await loginWithCode(phone, loginCode.value)
    }
    await completeLogin(identity)
  } catch (error) { if(error.cancelled)return;token.value = ''; authFeedback.value = error.message || '登录失败'; showToast(authFeedback.value, 'error') } finally { loading.value = false }
}

async function completeLogin(identity,attempt=++sessionVersion) {
  if (!/^1\d{10}$/.test(identity.mobile) || !identity.token) throw new Error('认证未返回有效手机号或token')
  token.value = identity.token
  const permission = await fetchPermission(identity.mobile, identity.token)
  if(attempt!==sessionVersion)throw cancelledSession()
  if (!permission || !['city', 'branch', 'grid'].includes(permission.role) || (permission.role !== 'city' && !permission.branchId) || (permission.role === 'grid' && !permission.gridId)) throw Object.assign(new Error('该手机号暂无查看权限'),{code:'SESSION_PERMISSION'})
  Object.assign(user, { isSuperAdmin: false }, permission)
  await loadDashboard()
  if(attempt!==sessionVersion)throw cancelledSession()
  sessionStore.save(identity)
  goWorkbench()
  page.value = 'dashboard'
  authFeedback.value = ''; loginCode.value = ''; codeCountdown.value = 0; clearInterval(codeTimer)
}

async function loadDashboard() {
  const requestToken=token.value,attempt=sessionVersion
  const data = await fetchDashboard({ phone: user.phone }, token.value)
  if(requestToken!==token.value || attempt!==sessionVersion)throw cancelledSession()
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
  if (data.warnings?.length) showToast(data.warnings.join('；'), 'warning')
  await loadAlerts()
  await loadAiAnalysis(dashboard.statDate)
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
async function refreshDashboard() { loading.value = true; try { await loadDashboard(); showToast('数据已刷新') } catch (error) { showToast(error.message || '刷新失败', 'error') } finally { loading.value = false } }
async function refreshAfterImport() { try { await loadDashboard() } catch (error) { showImportErrors('导入后的看板暂未就绪', [error.message || '请完成同日三张产能导入后刷新']) } }
async function sendCode() {
  if (loading.value || codeSending.value || codeCountdown.value > 0) return
  if (!agreedToTerms.value) return showToast('请先同意登录协议', 'warning')
  if (!/^1\d{10}$/.test(loginPhone.value)) return showToast('请先输入正确的手机号', 'warning')
  const phone = loginPhone.value
  codeSending.value = true
  authFeedback.value = '正在校验权限并请求验证码，请稍候…'
  try {
    await sendLoginCode(phone)
    if (phone !== loginPhone.value) return showToast('手机号已变更，请重新获取验证码', 'warning')
    if (isMock) loginCode.value = '123456'
    codeCountdown.value = 60
    clearInterval(codeTimer)
    codeTimer = setInterval(() => { if (--codeCountdown.value <= 0) clearInterval(codeTimer) }, 1000)
    authFeedback.value = isMock ? '模拟验证码：123456' : '验证码请求已提交，请留意短信。已有有效验证码也可直接登录。'
    showToast(isMock ? '模拟验证码：123456' : '验证码请求已提交')
  } catch (error) { authFeedback.value = error.message || '验证码发送失败'; showToast(authFeedback.value, 'error') }
  finally { codeSending.value = false }
}
async function oneClickLogin() {
  if (loading.value || codeSending.value) return
  if (!agreedToTerms.value) return showToast('请先同意登录协议', 'warning')
  loading.value = true
  try { await completeLogin(await loginWithOneClick()) }
  catch (error) { if(error.cancelled)return;token.value = ''; showToast(error.message || '一键登录失败，请使用短信登录', 'error') }
  finally { loading.value = false }
}

// ==================== 特殊文件的导入处理 ====================
async function handleTargetFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    if (user.isSuperAdmin !== true) throw new Error('仅超级管理员可导入目标')
    const rows = await parseTargetFile(file, dashboard)
    loading.value = true
    const result = await importTargets(rows, user, token.value)
    await loadDashboard()
    if (result.failed) throw new Error(`成功 ${result.success || 0} 条，失败 ${result.failed} 条：${(result.errors || []).join('；')}`)
    showToast(`已导入 ${result.imported ?? rows.length} 条目标`)
  } catch (error) {
    showToast(error.message || '导入失败', 'error')
  } finally {
    loading.value = false
  }
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

function formatTime(val) {
  if (!val) return ''
  if (typeof val === 'number' || /^\d+$/.test(val)) {
    const d = new Date(Number(val))
    const pad = n => n < 10 ? '0' + n : n
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return String(val).slice(0, 16)
}

function showImportErrors(title, errors) {
  const list = Array.isArray(errors) ? errors : []
  const MAX_SHOW = 100
  const shown = list.slice(0, MAX_SHOW)
  if (list.length > MAX_SHOW) shown.push(`…… 以及其余 ${list.length - MAX_SHOW} 条错误，建议分批处理`)
  importErrorTitle.value = title
  importErrorList.value = shown
  importErrorVisible.value = true
}

function showToast(message, type = 'success') { toast.message = message; toast.type = type; toast.show = true; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.show = false }, 3000) }
</script>
