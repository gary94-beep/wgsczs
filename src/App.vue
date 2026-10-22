<template>
  <div class="app-shell">
    <main v-if="page === 'login'" class="login-page">
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

    <main v-else class="dashboard-page">
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
              class="menu-copy"><strong>预警监控</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
          <button type="button" @click="openCampus"><span class="menu-icon menu-icon-blue"><i
                class="menu-glyph menu-glyph-campus" aria-hidden="true"></i></span><span
              class="menu-copy"><strong>校园生产管理</strong></span><i class="menu-chevron" aria-hidden="true"></i></button>
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
          <h3>权限与基础资料</h3>

          <div class="import-nav-item">
            <div class="import-nav-label">
              <span class="menu-icon menu-icon-blue">人</span>
              <span class="menu-copy"><strong>人员权限表</strong></span>
            </div>
            <div class="target-actions">
              <button type="button" class="icon-action" :disabled="loading" title="下载模板" aria-label="下载模板" @click="downloadPermissionTemplate">
                <span class="action-icon download-icon" aria-hidden="true"></span>
              </button>
              <button type="button" class="icon-action" :disabled="loading" title="导入数据" aria-label="导入数据" @click="permissionFileInput?.click()">
                <span class="action-icon upload-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div class="import-nav-item">
            <div class="import-nav-label">
              <span class="menu-icon menu-icon-blue">渠</span>
              <span class="menu-copy"><strong>渠道维度表</strong></span>
            </div>
            <div class="target-actions">
              <button type="button" class="icon-action" :disabled="loading" title="下载模板" aria-label="下载模板" @click="downloadChannelTemplate">
                <span class="action-icon download-icon" aria-hidden="true"></span>
              </button>
              <button type="button" class="icon-action" :disabled="loading" title="导入数据" aria-label="导入数据" @click="channelFileInput?.click()">
                <span class="action-icon upload-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div class="import-nav-item">
            <div class="import-nav-label">
              <span class="menu-icon menu-icon-blue">末</span>
              <span class="menu-copy"><strong>末梢维度表</strong></span>
            </div>
            <div class="target-actions">
              <button type="button" class="icon-action" :disabled="loading" title="下载模板" aria-label="下载模板" @click="downloadTerminalTemplate">
                <span class="action-icon download-icon" aria-hidden="true"></span>
              </button>
              <button type="button" class="icon-action" :disabled="loading" title="导入数据" aria-label="导入数据" @click="terminalFileInput?.click()">
                <span class="action-icon upload-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div class="import-nav-item">
            <div class="import-nav-label">
              <span class="menu-icon menu-icon-blue">自</span>
              <span class="menu-copy"><strong>自控团队工号表</strong></span>
            </div>
            <div class="target-actions">
              <button type="button" class="icon-action" :disabled="loading" title="下载模板" aria-label="下载模板" @click="downloadStaffTemplate">
                <span class="action-icon download-icon" aria-hidden="true"></span>
              </button>
              <button type="button" class="icon-action" :disabled="loading" title="导入数据" aria-label="导入数据" @click="staffFileInput?.click()">
                <span class="action-icon upload-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <h3>产能数据</h3>

          <div class="import-nav-item">
            <div class="import-nav-label">
              <span class="menu-icon menu-icon-green">区</span>
              <span class="menu-copy"><strong>区域产能</strong></span>
            </div>
            <div class="target-actions">
              <button type="button" class="icon-action" :disabled="loading" title="下载模板" aria-label="下载模板" @click="downloadRegionCapacityTemplate">
                <span class="action-icon download-icon" aria-hidden="true"></span>
              </button>
              <button type="button" class="icon-action" :disabled="loading" title="导入数据" aria-label="导入数据" @click="regionCapacityFileInput?.click()">
                <span class="action-icon upload-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div class="import-nav-item">
            <div class="import-nav-label">
              <span class="menu-icon menu-icon-green">渠</span>
              <span class="menu-copy"><strong>渠道产能</strong></span>
            </div>
            <div class="target-actions">
              <button type="button" class="icon-action" :disabled="loading" title="下载模板" aria-label="下载模板" @click="downloadChannelCapacityTemplate">
                <span class="action-icon download-icon" aria-hidden="true"></span>
              </button>
              <button type="button" class="icon-action" :disabled="loading" title="导入数据" aria-label="导入数据" @click="channelCapacityFileInput?.click()">
                <span class="action-icon upload-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div class="import-nav-item">
            <div class="import-nav-label">
              <span class="menu-icon menu-icon-green">工</span>
              <span class="menu-copy"><strong>工号产能</strong></span>
            </div>
            <div class="target-actions">
              <button type="button" class="icon-action" :disabled="loading" title="下载模板" aria-label="下载模板" @click="downloadStaffCapacityTemplate">
                <span class="action-icon download-icon" aria-hidden="true"></span>
              </button>
              <button type="button" class="icon-action" :disabled="loading" title="导入数据" aria-label="导入数据" @click="staffCapacityFileInput?.click()">
                <span class="action-icon upload-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <h3>目标与话术</h3>

          <div class="import-nav-item">
            <div class="import-nav-label">
              <span class="menu-icon menu-icon-yellow">产</span>
              <span class="menu-copy"><strong>产品目标表</strong></span>
            </div>
            <div class="target-actions">
              <button type="button" class="icon-action" :disabled="loading" title="下载模板" aria-label="下载模板" @click="downloadTargetTemplate">
                <span class="action-icon download-icon" aria-hidden="true"></span>
              </button>
              <button type="button" class="icon-action" :disabled="loading" title="导入数据" aria-label="导入数据" @click="targetFileInput?.click()">
                <span class="action-icon upload-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div class="import-nav-item">
            <div class="import-nav-label">
              <span class="menu-icon menu-icon-yellow">经</span>
              <span class="menu-copy"><strong>经典话术表</strong></span>
            </div>
            <div class="target-actions">
              <button type="button" class="icon-action" :disabled="loading" title="下载模板" aria-label="下载模板" @click="downloadScriptTemplate">
                <span class="action-icon download-icon" aria-hidden="true"></span>
              </button>
              <button type="button" class="icon-action" :disabled="loading" title="导入数据" aria-label="导入数据" @click="scriptFileInput?.click()">
                <span class="action-icon upload-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>
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
            :title="item.productName" :item="item" :unit="item.unit" :stat-date="dashboard.statDate"
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

      <template v-else-if="stage === 'warnings'">
        <header class="drill-page-title"><h2>预警监控</h2><p>{{ scopeName }}</p></header>
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
          <div class="alert-summary">
            <div v-for="category in alertCategories" :key="category.id" class="alert-scale-column">
              <span class="scale-title">{{ category.id === 'people' ? '直销队伍' : category.label }}总规模</span>
              <strong class="summary-total-count">{{ category.total ?? '—' }}<small>{{ category.id === 'people' ? '人' : '个' }}</small></strong>
              <span>{{ isChangeAlert ? '异动预警' : '低产预警' }}</span>
              <strong class="summary-warning-count">{{ category.count }}<small>{{ category.id === 'people' ? '人' : '个' }}</small></strong>
              <span>{{ isChangeAlert ? '异动预警率' : '低产预警率' }}</span><strong class="summary-warning-rate">{{ category.rate === null ? '—' : category.rate + '%' }}</strong>
            </div>
          </div>
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
              :key="`${item.gridId}-${item.channelCode || item.channel}-${item.channelType}`" class="channel-card"
              :data-category="item.channelType">
              <div class="channel-head"><strong>{{ tab === 'tail' ? item.microChannelName || item.channel : item.channel
              }}</strong><span>{{ isChangeAlert ? '异动' : item.production === 0 ? '零产' : '低产' }}</span></div>
              <div class="channel-category">{{ tab === 'stars' ? `${item.channelStar ? item.channelStar + '星' : '星级未提供'}
                · ${item.channelCode || '渠道编码未提供'}` : item.serviceProvider || '区域服务商未提供' }}</div>
              <div class="alert-organization">{{ branchName(item.branchId) }} · {{ gridName(item.gridId) || '网格未提供' }}
              </div>
              <div class="channel-meta"><span>{{ displayNumber(item.production) }} {{ activeProduct?.unit
              }}</span><span>{{ item.staffCount }} 人</span></div>
              <div v-if="isChangeAlert" class="change-comparison"><span>上月同期日均 {{ displayNumber(item.previousAverage) }} · 本月日均 {{ displayNumber(item.monthAverage) }} {{ activeProduct?.unit }}/日</span><strong>-{{ displayNumber(item.declineValue) }} {{ activeProduct?.unit }}/日（-{{ displayNumber(item.declineRate) }}%）</strong></div>
            </article>
            <p v-if="!displayedChannels.length" class="empty-state">当前条件下暂无{{ isChangeAlert ? '异动' : '低产' }}渠道</p>
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
        <CampusAnalysis :phone="user.phone" :token="token" />
      </template>

      <nav v-if="stage !== 'workbench'" class="bottom-nav" aria-label="主导航"><button type="button"
          :class="{ active: stage === 'campus' }" @click="goWorkbench"><i class="bottom-icon bottom-home"
            aria-hidden="true"></i><span>工作台</span></button><button type="button"
          :class="{ active: ['overview', 'branches', 'grids'].includes(stage) }" @click="goOverview"><i
            class="bottom-icon bottom-overview" aria-hidden="true"></i><span>生产总览</span></button><button type="button"
          :class="{ active: ['warnings', 'monitor', 'alerts'].includes(stage) }" @click="openMonitor"><i
            class="bottom-icon bottom-alert" aria-hidden="true"></i><span>预警监控</span></button></nav>
    </main>

    <main v-if="loading" class="loading-mask"><span class="loading-spinner"></span><span>加载中...</span></main>
    <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>

    <input ref="permissionFileInput" type="file" accept=".xlsx,.xls,.csv" hidden @change="handlePermissionFile" />
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
import lowWarningIcon from './assets/warning-icons/triangle-alert.svg'
import changeWarningIcon from './assets/warning-icons/chart-no-axes-combined.svg'
import { isMock } from './api/client'
import { sendLoginCode, loginWithCode, loginWithOneClick } from './api/auth.js'
import { fetchChangeAlerts, fetchDashboard, fetchPermission, getMobileByToken, fetchAlerts, queryCapacity, importCapacity, importRows, importTargets, saveSalesScript, importSalesScripts, fetchAiAnalysis } from './api/production'
import ChannelTypeFilter from './components/ChannelTypeFilter.vue'
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
import CapacitySearch from './components/CapacitySearch.vue'
import { buildCapacityMetric } from './utils/capacityMetrics.js'
import { parseCsv, parseExcelFile, normalizeCapacityRows, downloadCsv, ensureXlsx } from './utils/imports/helpers.js'
import { channelInfoRows, channelInfoTemplateCsv } from './utils/imports/channelInfo.js'
import { terminalInfoRows, terminalInfoTemplateCsv } from './utils/imports/terminalInfo.js'
import { staffInfoRows, staffInfoTemplateCsv } from './utils/imports/staffInfo.js'
import { regionCapacityRows, regionCapacityTemplateCsv } from './utils/imports/regionCapacity.js'
import { channelCapacityRows, channelCapacityTemplateCsv } from './utils/imports/channelCapacity.js'
import { staffCapacityRows, staffCapacityTemplateCsv } from './utils/imports/staffCapacity.js'
import { permissionRows, permissionTemplateCsv } from './utils/imports/permission.js'
import { validateScriptImport, scriptTemplateCsv } from './utils/imports/salesScript.js'
import { parseTargetFile, targetTemplateCsv } from './utils/imports/targets.js'

const warningIcons = {
  low: { '--warning-icon': `url(${JSON.stringify(lowWarningIcon)})` },
  change: { '--warning-icon': `url(${JSON.stringify(changeWarningIcon)})` }
}
const exportIconStyle = { '--export-icon': `url(${JSON.stringify(downloadIcon)})` }
const dataImportIconStyle = { '--import-icon': `url(${JSON.stringify(uploadIcon)})` }
const exportBusy = ref(false)
const alertSnapshot = ref(null)
const overviewPeriod = ref('month')
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

// AI 分析结果
const aiAnalysis = reactive({
  loading: false,
  error: '',
  byScope: {}    // key: "scopeType::scopeId::channelType" -> { answer, updatedAt }
})

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

// ============ AI 分析结果（按 scope + channel 取） ============
function aiScopeKey(type, id, channel = '') { 
  const c = channel || '全部类型'
  return `${type}::${id}::${c}` 
}
function aiEntry(type, id) { 
  const currentType = selectedChannelType.value || '全部类型'
  return aiAnalysis.byScope[aiScopeKey(type, id, currentType)] || null 
}
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
  aiAnalysis.loading = true
  aiAnalysis.error = ''
  try {
    const currentChannelType = selectedChannelType.value || ''
    
    const data = await fetchAiAnalysis({ 
      statDate, 
      phone: user.phone,
      channelType: currentChannelType 
    }, token.value)
    
    const map = {}
    for (const row of (data?.rows || [])) {
      // 【核心修改】：把 channelType 也加入到缓存的 Key 里面
      const cacheKey = aiScopeKey(row.scopeType, row.scopeId, row.channelType)
      map[cacheKey] = {
        answer: row.answer || '',
        updatedAt: row.updatedAt || ''
      }
    }
    aiAnalysis.byScope = map
  } catch (e) {
    aiAnalysis.error = e.message || 'AI 分析读取失败'
  } finally {
    aiAnalysis.loading = false
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
].map(category => {
  const value = alertResult.value?.totals?.[category.id]
  const total = typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
  return { ...category, total, rate: total !== null && total > 0 && category.count <= total ? Math.round(category.count / total * 1000) / 10 : null }
}))
const displayedChannels = computed(() => lowChannels.value.filter(item => item.channelType === (tab.value === 'stars' ? '三星+渠道' : '末梢渠道')))
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
function openMonitor() { stage.value = 'warnings'; scrollTop() }
function openAlertMonitor(mode) { alertMode.value = mode; monitorBranchId.value = user.role === 'city' ? '' : user.branchId; monitorGridId.value = user.role === 'grid' ? user.gridId : ''; monitorProductId.value = dashboard.products[0]?.productId || ''; selectedChannel.value = ''; threshold.value = 1; tab.value = 'people'; stage.value = 'monitor'; scrollTop() }
function openCampus() { stage.value = 'campus'; scrollTop() }
function openSearch() { stage.value = 'search'; scrollTop() }
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

// 【监听渠道切换】：当用户切换渠道类型时，重新拉取 AI 分析
watch(selectedChannelType, () => {
  if (dashboard.statDate) {
    loadAiAnalysis(dashboard.statDate)
  }
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
function expireSession() { token.value = ''; page.value = 'login'; alertSequence++; alertResult.value = null; aiAnalysis.byScope = {}; Object.assign(dashboard, { organization: { cityName: '', branches: [], grids: [] }, rows: [], dailyRows: [], targets: [], regionRows: undefined, periodRows: [], salesScripts: [] }); showToast('登录已过期，请重新认证', 'warning') }

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
  if (data.warnings?.length) showToast(data.warnings.join('；'), 'warning')
  await loadAlerts()
  // AI 分析结果
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

// ==================== 模板下载 ====================
function downloadPermissionTemplate() {
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可下载权限模板', 'warning')
  downloadCsv(permissionTemplateCsv(), '人员权限表导入模板.csv')
}
function downloadChannelTemplate() {
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可下载渠道维度模板', 'warning')
  downloadCsv(channelInfoTemplateCsv(), '渠道维度表导入模板.csv')
}
function downloadTerminalTemplate() {
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可下载末梢模板', 'warning')
  downloadCsv(terminalInfoTemplateCsv(), '末梢维度表导入模板.csv')
}
function downloadStaffTemplate() {
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可下载员工模板', 'warning')
  downloadCsv(staffInfoTemplateCsv(), '自控团队工号表导入模板.csv')
}
function downloadRegionCapacityTemplate() {
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可下载区域产能模板', 'warning')
  downloadCsv(regionCapacityTemplateCsv(), '区域汇总产能表导入模板.csv')
}
function downloadChannelCapacityTemplate() {
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可下载渠道产能模板', 'warning')
  downloadCsv(channelCapacityTemplateCsv(), '渠道汇总产能表导入模板.csv')
}
function downloadStaffCapacityTemplate() {
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可下载工号产能模板', 'warning')
  downloadCsv(staffCapacityTemplateCsv(), '工号汇总产能表导入模板.csv')
}
function downloadTargetTemplate() {
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可下载目标模板', 'warning')
  downloadCsv(targetTemplateCsv(dashboard), '产能目标表导入模板.csv')
}
function downloadScriptTemplate() {
  if (user.isSuperAdmin !== true) return showToast('仅超级管理员可下载话术模板', 'warning')
  downloadCsv(scriptTemplateCsv(dashboard.products), '产品经典话术表导入模板.csv')
}

// ==================== 数据导入 ====================
function handlePermissionFile(event) {
  return handleImportFile(event, 'permission', permissionRows, '权限表')
}
function handleChannelFile(event) {
  return handleImportFile(event, 'channelInfo', channelInfoRows, '渠道维度表')
}
function handleTerminalFile(event) {
  return handleImportFile(event, 'terminal', terminalInfoRows, '末梢表')
}
function handleStaffFile(event) {
  return handleImportFile(event, 'staff', staffInfoRows, '员工表')
}
function handleRegionCapacityFile(event) {
  return handleCapacityImportFile(event, 'region', regionCapacityRows, '区域产能')
}
function handleChannelCapacityFile(event) {
  return handleCapacityImportFile(event, 'channel', channelCapacityRows, '渠道产能')
}
function handleStaffCapacityFile(event) {
  return handleCapacityImportFile(event, 'staff', staffCapacityRows, '工号产能')
}
async function handleTargetFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    if (user.isSuperAdmin !== true) throw new Error('仅超级管理员可导入目标')
    const rows = await parseTargetFile(file, dashboard)
    loading.value = true
    await importTargets(rows, user, token.value)
    await loadDashboard()
    showToast(`已导入 ${rows.length} 条目标`)
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
    rows = normalizeCapacityRows(rows)

    if (!user.isSuperAdmin) throw new Error('仅超级管理员可导入')
    const result = await importCapacity(target, rows, token.value)
    await refreshAfterImport()
    if (result?.failed > 0) {
      showToast(`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`, 'warning')
      showImportErrors(`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`, result.errors || [])
    } else {
      showToast(`导入成功，共 ${result.success} 条`)
    }
  } catch (error) {
    showToast(error.message || `${label}导入失败`, 'error')
  } finally {
    loading.value = false
  }
}

function formatTime(val) {
  if (!val) return ''
  // 如果是纯数字的时间戳
  if (typeof val === 'number' || /^\d+$/.test(val)) {
    const d = new Date(Number(val))
    const pad = n => n < 10 ? '0' + n : n
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  // 如果本来就是字符串，直接截取到分钟
  return String(val).slice(0, 16)
}

// ==================== 导入失败弹窗 ====================
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