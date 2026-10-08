<template>
  <div class="app-shell">
    <!-- 页面初始化遮罩：解决刷新瞬间闪登录页 -->
    <div v-if="isBooting" class="boot-mask">
      <var-loading type="circle"/>
      <span>初始化中...</span>
    </div>
    <!-- 顶部导航栏组件，根据当前页面显示标题和返回按钮 -->
    <AppHeader :title="pageTitle" :show-back="page !== 'home' && page !== 'login'" @back="goBack" />

    <!-- 全局加载状态页面 -->
    <main v-if="loading" class="loading-page">
      <var-loading type="circle" />
      <span>加载数据中...</span>
    </main>

    <!-- 登录页面 -->
    <main v-else-if="page === 'login'" class="page login-page">
      <section class="login-title-block">
        <h1>校园生产通</h1>
        <p class="platform-title"><span></span>现场生产管理平台<span></span></p>
      </section>

      <section class="login-card">
        <h2>用户登录</h2>
        <!-- 手机号输入框，限制11位数字 -->
        <label class="login-field">
          <input v-model.trim="loginPhone" type="tel" maxlength="11" placeholder="请输入11位手机号" />
        </label>
        <!-- 验证码输入与发送区域 -->
        <div class="code-row">
          <label class="login-field">
            <input v-model.trim="loginCode" type="tel" maxlength="6" placeholder="请输入验证码" />
          </label>
          <button class="code-button" type="button" :disabled="loading || codeSending || loginLoading" @click="sendCode">
            {{ codeSending ? '发送中...' : '获取验证码' }}
          </button>
        </div>
        <button class="login-button" type="button" :disabled="loginLoading" @click="handleLogin">
          {{ loginLoading ? '登录中…' : '登 录' }}
        </button>
        <button class="one-click-button" type="button" :disabled="loginLoading" @click="handleOneClickLogin">
          {{ loginLoading ? '登录中...' : '本机号码一键登录' }}
        </button>
      </section>

      <!-- 隐私协议勾选 -->
      <div
        class="privacy-row"
        :class="{ 'privacy-shake': privacyShake }"
        @animationend="privacyShake = false"
      >
        <span
          class="privacy-check"
          :class="{ checked: agreedPrivacy }"
          role="checkbox"
          :aria-checked="agreedPrivacy"
          tabindex="0"
          @click="togglePrivacy"
          @keydown.space.prevent="togglePrivacy"
        ></span>
        <span class="privacy-text" @click="togglePrivacy">
          登录即同意
          <a href="https://wap.cmpassport.com/resources/html/contract.html" target="_blank" rel="noopener noreferrer" @click.stop>《中国移动号码服务条款》</a>、
          <a href="https://gd.10086.cn/gmccapp/webpage/protocol/protocol.html" target="_blank" rel="noopener noreferrer" @click.stop>《中国移动广东公司电子渠道登录服务协议》</a>
          和
          <a href="https://gd.10086.cn/gmccapp/webpage/protocol/safePro.html" target="_blank" rel="noopener noreferrer" @click.stop>《隐私协议》</a>
        </span>
      </div>

      <div class="network-tips">
        <span>3G/4G/5G环境下建议选择一键登录</span>
        <span>Wi-Fi环境下请选择短信登录</span>
      </div>
    </main>

    <!-- 首页工作台 -->
    <main v-else-if="page === 'home'" class="page">
      <section class="hero">
        <span class="hero-tag">高校现场工作台</span>
        <h1>校园生产通</h1>
      </section>

      <section class="home-menu">
        <!-- 生产登记入口 -->
        <button class="menu-card" type="button" @click="openRegister()">
          <span class="menu-icon blue">录</span>
          <span class="menu-text">
            <strong>生产登记</strong>
            <small>选择学校、学院、楼栋，进入宿舍登记。</small>
          </span>
          <span class="menu-arrow">›</span>
        </button>

        <!-- 生产情况分析入口（role 1 或 9 可见） -->
        <button v-if="canAnalysis" class="menu-card orange-line" type="button" @click="openAnalysis">
          <span class="menu-icon orange">析</span>
          <span class="menu-text">
            <strong>生产情况分析</strong>
            <small>按学院查看所有楼栋的触达进度和营销进度。</small>
          </span>
          <span class="menu-arrow">›</span>
        </button>

        <!-- 数据导入入口（仅 superAdm / role 9 可见） -->
        <button v-if="canImport" class="menu-card green-line" type="button" @click="openImport">
          <span class="menu-icon green">导</span>
          <span class="menu-text">
            <strong>数据导入</strong>
            <small>批量导入生产人员权限表、宿舍清单列表。</small>
          </span>
          <span class="menu-arrow">›</span>
        </button>
      </section>
    </main>

    <!-- 数据导入页面 -->
    <main v-else-if="page === 'import'" class="page import-page">
      <section class="import-list">
        <!-- 生产人员权限表 -->
        <div class="import-row">
          <div class="import-title">
            <strong>生产人员权限表</strong>
            <small>id / phone / name / role / enabled / updatedAt</small>
          </div>
          <button class="import-btn outline-btn" type="button" @click="downloadUserTemplate">下载模版</button>
          <button class="import-btn primary-btn" type="button" :disabled="importing" @click="triggerUserImport">导入</button>
        </div>

        <!-- 宿舍清单列表 -->
        <div class="import-row">
          <div class="import-title">
            <strong>宿舍清单列表</strong>
            <small>id / school / college / building / floor / room / beds</small>
          </div>
          <button class="import-btn outline-btn" type="button" @click="downloadDormTemplate">下载模版</button>
          <button class="import-btn primary-btn" type="button" :disabled="importing" @click="triggerDormImport">导入</button>
        </div>
      </section>

      <!-- 隐藏的文件选择控件 -->
      <input
        ref="userImportInput"
        type="file"
        accept=".csv,text/csv"
        style="display:none"
        @change="handleUserImportFile"
      />
      <input
        ref="dormImportInput"
        type="file"
        accept=".csv,text/csv"
        style="display:none"
        @change="handleDormImportFile"
      />
    </main>

    <!-- 生产登记页面（宿舍总览） -->
    <main v-else-if="page === 'register'" class="page">
      <!-- 筛选条件面板 -->
      <section class="filter-panel">
        <button class="filter-item" type="button" @click="showSchoolPicker = true">
          <span>学校</span>
          <strong>{{ filters.school }}</strong>
        </button>
        <button class="filter-item" type="button" @click="showCollegePicker = true">
          <span>学院</span>
          <strong>{{ filters.college }}</strong>
        </button>
        <button class="filter-item" type="button" @click="showBuildingPicker = true">
          <span>楼栋</span>
          <strong>{{ filters.building }}</strong>
        </button>
        <button class="filter-item" type="button" @click="showFloorPicker = true">
          <span>楼层</span>
          <strong>{{ filters.floor }}</strong>
        </button>
      </section>

      <!-- 统计卡片区域 -->
      <section class="stats-grid">
        <StatCard title="触达成功" :value="summary.reached" desc="已接触到客户" type="reached" />
        <StatCard title="营销成功" :value="summary.marketed" desc="已办理业务" type="marketed" />
        <StatCard title="未触达" :value="summary.unreached" desc="需生产触达" />
      </section>

      <!-- 按楼栋分组的宿舍列表 -->
      <section v-for="(rooms, building) in groupedDorms" :key="building" class="building-block">
        <!-- 仅在第一个楼栋显示工具栏（标签切换和刷新） -->
        <div v-if="building === firstBuildingName" class="dorm-toolbar">
          <div>
            <h2>宿舍列表</h2>
            <p>{{ filteredDorms.length }} 间宿舍</p>
          </div>
          <button class="refresh-button" type="button" @click="refreshDorms">刷新</button>
          <div class="segment">
            <button :class="{ active: tab === 'all' }" type="button" @click="tab = 'all'">全部</button>
            <button :class="{ active: tab === 'unreached' }" type="button" @click="tab = 'unreached'">未完成触达</button>
            <button :class="{ active: tab === 'unmarketed' }" type="button" @click="tab = 'unmarketed'">未完成营销</button>
          </div>
        </div>
        <!-- 楼栋信息头部 -->
        <div class="building-row">
          <div class="building-title">{{ building }}</div>
          <div class="building-meta">{{ rooms.length }} 间宿舍 | {{ buildingBedCount(rooms) }} 个床位 | 待触达 {{ buildingUnreachedCount(rooms) }}</div>
        </div>
        <!-- 宿舍卡片网格 -->
        <div class="room-grid">
          <RoomCard v-for="room in rooms" :key="room.id" :room="room" @open="openRoom" />
        </div>
      </section>
    </main>

    <!-- 生产情况分析页面 -->
    <main v-else-if="page === 'analysis'" class="page">
      <section class="analysis-school-filter">
        <button type="button" @click="showAnalysisSchoolPicker = true">
          <span>当前学校</span>
          <strong>{{ analysisSchool }}</strong>
        </button>
      </section>

      <section class="analysis-overview">
        <h2>现场总览</h2>
        <div class="overview-stats">
          <span><strong>{{ reachedRate }}%</strong>触达率</span>
          <span><strong>{{ marketedRate }}%</strong>营销率</span>
          <span><strong>{{ totalSummary.unreached }}</strong>待触达</span>
        </div>
        <p>共 {{ totalSummary.rooms }} 间宿舍，{{ totalSummary.beds }} 个床位，已接触 {{ totalSummary.reached }} 人，已办理 {{ totalSummary.marketed }} 人。</p>
      </section>

      <section class="analysis-actions">
        <button type="button" class="outline-action" @click="openRegister()">进入生产登记</button>
        <button type="button" class="primary-action" @click="refreshDorms">刷新分析</button>
      </section>

      <button type="button" class="export-card" @click="handleExport">
        <span>
          <strong>导出全部数据</strong>
          <small>可导出宿舍汇总或人员登记明细 Excel</small>
        </span>
        <b>导出 ›</b>
      </button>

      <section class="section-head analysis-list-head">
        <div>
          <h2>楼栋进度</h2>
          <p>按学院分组，按触达进度从低到高排列</p>
        </div>
        <button type="button" class="analysis-export-button" @click="handleBuildingProgressExport">导出进度</button>
      </section>

      <!-- 按学院分组的楼栋进度列表 -->
      <section v-for="group in analysisByCollege" :key="group.college" class="college-block">
        <div class="college-head">
          <h3>{{ group.college }}</h3>
          <span>触达 {{ group.reachedRate }}%</span>
        </div>
        <BuildingProgress v-for="item in group.items" :key="item.college + item.building" :item="item" @open="openRegister" />
      </section>
    </main>

    <!-- 单个宿舍登记详情页 -->
    <main v-else-if="page === 'room' && activeRoom" class="page room-page">
      <section class="room-summary">
        <h2>{{ activeRoom.school || filters.school }} · {{ activeRoom.college }} · {{ activeRoom.building }} · {{ activeRoom.floor }} · {{ activeRoom.room }}</h2>
        <div class="mini-stats">
          <span><strong>{{ activeRoom.beds }}</strong>床位数</span>
          <span><strong>{{ form.reachedBeds.length }}</strong>触达成功</span>
          <span><strong>{{ form.marketedBeds.length }}</strong>营销成功</span>
          <span><strong>{{ activeRoom.beds - form.reachedBeds.length }}</strong>未触达</span>
        </div>
      </section>

      <var-alert type="success" message="营销成功只能从已触达床位中选择，未触达床位会自动置灰。" />

      <!-- 触达床位选择 -->
      <section class="form-card">
        <div class="form-title">请选择触达成功的床号</div>
        <div class="bed-grid">
          <button
            v-for="bed in activeRoom.beds"
            :key="'r' + bed"
            class="bed-button"
            :class="{ active: form.reachedBeds.includes(bed), disabled: isReachedLocked(bed) }"
            type="button"
            @click="toggleReached(bed)"
          >
            {{ bed }}
          </button>
        </div>
      </section>

      <!-- 营销床位选择（仅可从已触达中选择） -->
      <section class="form-card">
        <div class="form-title">请选择营销成功的床号</div>
        <div class="bed-grid">
          <button
            v-for="bed in activeRoom.beds"
            :key="'m' + bed"
            class="bed-button"
            :class="{ active: form.marketedBeds.includes(bed), disabled: !form.reachedBeds.includes(bed) || isMarketedLocked(bed) }"
            type="button"
            @click="toggleMarketed(bed)"
          >
            {{ bed }}
          </button>
        </div>
      </section>

      <!-- 备注输入 -->
      <section class="form-card">
        <div class="form-title">备注</div>
        <var-input v-model="form.remark" textarea :rows="4" maxlength="200" :disabled="isRemarkLocked" placeholder="例如：学生不在、拒绝营销、需再次拜访等" />
      </section>

      <!-- 底部操作栏 -->
      <section class="bottom-bar">
        <button v-if="canDeleteActiveRoom" class="delete-button" type="button" @click="handleDelete">删除记录</button>
        <var-button class="save-button" type="primary" size="large" :loading="saving" @click="handleSave">保存</var-button>
      </section>
    </main>

    <!-- 学校选择弹窗（登记页） -->
    <div v-if="showSchoolPicker" class="sheet-mask" @click.self="showSchoolPicker = false">
      <section class="select-sheet">
        <div class="sheet-title">选择学校</div>
        <button v-for="item in schoolOptions" :key="item" type="button" @click="pickSchool(item)">{{ item }}</button>
      </section>
    </div>
    <!-- 学校选择弹窗（分析页） -->
    <div v-if="showAnalysisSchoolPicker" class="sheet-mask" @click.self="showAnalysisSchoolPicker = false">
      <section class="select-sheet">
        <div class="sheet-title">选择学校</div>
        <button v-for="item in schoolOptions" :key="item" type="button" @click="pickAnalysisSchool(item)">{{ item }}</button>
      </section>
    </div>
    <!-- 学院选择弹窗 -->
    <div v-if="showCollegePicker" class="sheet-mask" @click.self="showCollegePicker = false">
      <section class="select-sheet">
        <div class="sheet-title">选择学院</div>
        <button v-for="item in collegeOptions" :key="item" type="button" @click="pickCollege(item)">{{ item }}</button>
      </section>
    </div>
    <!-- 楼栋选择弹窗 -->
    <div v-if="showBuildingPicker" class="sheet-mask" @click.self="showBuildingPicker = false">
      <section class="select-sheet">
        <div class="sheet-title">选择楼栋</div>
        <button v-for="item in buildingOptions" :key="item" type="button" @click="pickBuilding(item)">{{ item }}</button>
      </section>
    </div>
    <!-- 楼层选择弹窗 -->
    <div v-if="showFloorPicker" class="sheet-mask" @click.self="showFloorPicker = false">
      <section class="select-sheet">
        <div class="sheet-title">选择楼层</div>
        <button v-for="item in floorOptions" :key="item" type="button" @click="pickFloor(item)">{{ item }}</button>
      </section>
    </div>

    <!-- 导入错误明细弹窗 -->
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
import { Dialog, Snackbar } from '@varlet/ui'
import { computed, onMounted, reactive, ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import BuildingProgress from './components/BuildingProgress.vue'
import RoomCard from './components/RoomCard.vue'
import StatCard from './components/StatCard.vue'
import { buildAnalysis, countSummary, groupByBuilding } from './utils/summary'

// ==================== 测试开关 ====================
/**
 * 测试模式：true 时跳过登录直接进入首页（使用模拟用户，默认 superAdm）
 * 上线前请改回 false
 */
const SKIP_LOGIN_FOR_TEST = false

// ==================== 系统常量 ====================
const APP_ID = 'cx5f6703315a2541b6'
const ACTIVITY_ID = 'xysct'
// 自定义函数业务标识
const GET_CUSTOME_SERVICE_CODE = 'Fcbfd3d8cf170a25'
// 自定义函数方法标识
const GET_PERMISSION_FUNC_CODE = 'xysct_fetchPermission'
const GET_MOBILE_BY_TOKEN_FUNC_CODE = 'xysct_getMobileByToken'
const GET_DORMS_FUNC_CODE = 'xysct_getDorms'       
const SAVE_RECORD_FUNC_CODE = 'xysct_saveRecord'    
const EXPORT_ALL_FUNC_CODE = 'xysct_exportAll'
// 数据导入方法标识
const IMPORT_USERS_FUNC_CODE = 'xysct_importUsers'
const IMPORT_DORMS_FUNC_CODE = 'xysct_importDorms'
const IS_TEST = 0 //测试环境1 生产环境0

// ==================== 响应式状态定义 ====================
/** 当前页面标识，可选值：login/home/import/register/analysis/room */
const page = ref('login')
/** 全局加载状态 */
const loading = ref(false)
/** 保存操作加载状态 */
const saving = ref(false)
/** 验证码发送中状态 */
const codeSending = ref(false)
/** 数据导入中状态 */
const importing = ref(false)
/** 登录令牌，页面刷新后不自动恢复，统一回到登录页 */
const token = ref('')
/** 登录手机号 */
const loginPhone = ref('')
/** 登录验证码 */
const loginCode = ref('')
/** 全部宿舍数据列表 */
const dorms = ref([])
/** 当前选中的宿舍房间对象 */
const activeRoom = ref(null)
/** 宿舍列表标签页筛选：all/unreached/unmarketed */
const tab = ref('all')
/** 是否显示学校选择弹窗（登记页） */
const showSchoolPicker = ref(false)
/** 是否显示学校选择弹窗（分析页） */
const showAnalysisSchoolPicker = ref(false)
/** 是否显示学院选择弹窗 */
const showCollegePicker = ref(false)
/** 是否显示楼栋选择弹窗 */
const showBuildingPicker = ref(false)
/** 是否显示楼层选择弹窗 */
const showFloorPicker = ref(false)
/** 全局保存登陆号码 */
const globalPhone = ref('')
/** 登录按钮局部loading，仅登录按钮转圈 */
const loginLoading = ref(false)
/** 页面启动初始化遮罩，防止刷新瞬间闪登录页 */
const isBooting = ref(true)
/** 是否已勾选隐私协议 */
const agreedPrivacy = ref(false)
/** 隐私协议行抖动动画开关 */
const privacyShake = ref(false)
/** 生产人员权限表导入 input 引用 */
const userImportInput = ref(null)
/** 宿舍清单列表导入 input 引用 */
const dormImportInput = ref(null)
/** 导入错误弹窗是否显示 */
const importErrorVisible = ref(false)
/** 导入错误弹窗标题 */
const importErrorTitle = ref('')
/** 导入错误弹窗内容列表 */
const importErrorList = ref([])

/** 当前登录用户信息 */
const user = reactive({
  name: '',
  phone: '',
  role: 'register'
})

/** 登记页筛选条件 */
const filters = reactive({
  school: 'GY',
  college: '食科',
  building: '全部楼栋',
  floor: '全部'
})

/** 分析页当前选中的学校 */
const analysisSchool = ref('GY')

/** 房间登记表单数据 */
const form = reactive({
  reachedBeds: [],      // 已触达床位号数组
  marketedBeds: [],     // 已营销床位号数组
  remark: ''            // 备注内容
})

// ==================== 计算属性 ====================
/**
 * 根据当前页面返回对应的页面标题
 * @returns {string} 页面标题文本
 */
const pageTitle = computed(() => {
  const titles = {
    home: '工作台',
    login: '用户登录',
    import: '数据导入',
    register: '生产总览',
    analysis: '生产情况分析',
    room: '生产结果'
  }
  return titles[page.value]
})

/**
 * 判断当前用户是否具有分析权限
 * role 1（分析员）、9（superAdm）可见
 * @returns {boolean} true表示有分析权限
 */
const canAnalysis = computed(() => user.role === 1 || user.role === 9)

/**
 * 判断当前用户是否具有数据导入权限
 * 仅 superAdm（role 9）可见
 * @returns {boolean} true表示有导入权限
 */
const canImport = computed(() => user.role === 9)

/**
 * 从全部宿舍数据中提取学校选项列表
 * @returns {string[]} 学校名称数组
 */
const schoolOptions = computed(() => [...new Set(dorms.value.map(item => item.school || 'GY'))])

/**
 * 根据当前选中的学校，提取对应的学院选项列表
 * @returns {string[]} 学院名称数组
 */
const collegeOptions = computed(() => [...new Set(dorms.value.filter(item => (item.school || 'GY') === filters.school).map(item => item.college))])

/**
 * 根据当前选中的学校和学院，提取楼栋选项列表（包含"全部楼栋"）
 * @returns {string[]} 楼栋名称数组
 */
const buildingOptions = computed(() => ['全部楼栋', ...new Set(dorms.value.filter(item => (item.school || 'GY') === filters.school && item.college === filters.college).map(item => item.building))])

/**
 * 根据当前筛选条件提取楼层选项列表（包含"全部"）
 * @returns {string[]} 楼层标识数组
 */
const floorOptions = computed(() => ['全部', ...new Set(dorms.value.filter(item => (item.school || 'GY') === filters.school && item.college === filters.college && (filters.building === '全部楼栋' || item.building === filters.building)).map(item => item.floor))])

/**
 * 根据筛选条件和标签页状态过滤宿舍列表
 * @returns {Object[]} 符合条件的宿舍对象数组
 */
const filteredDorms = computed(() => dorms.value.filter(item => {
  const schoolOk = (item.school || 'GY') === filters.school
  const collegeOk = item.college === filters.college
  const buildingOk = filters.building === '全部楼栋' || item.building === filters.building
  const floorOk = filters.floor === '全部' || item.floor === filters.floor
  const tabOk = tab.value === 'all'
    || (tab.value === 'unreached' && item.reachedBeds.length < item.beds)
    || (tab.value === 'unmarketed' && item.marketedBeds.length < item.beds)
  return schoolOk && collegeOk && buildingOk && floorOk && tabOk
}))

/**
 * 将过滤后的宿舍列表按楼栋名称分组
 * @returns {Object} 以楼栋名为键、宿舍数组为值的对象
 */
const groupedDorms = computed(() => groupByBuilding(filteredDorms.value))

/**
 * 获取分组后的第一个楼栋名称，用于显示工具栏
 * @returns {string} 第一个楼栋名称
 */
const firstBuildingName = computed(() => Object.keys(groupedDorms.value)[0])

/**
 * 计算当前筛选条件下宿舍的统计摘要（触达、营销、未触达人数）
 * @returns {Object} 统计结果对象
 */
const summary = computed(() => countSummary(filteredDorms.value))

/**
 * 获取分析页当前学校下的所有宿舍数据
 * @returns {Object[]} 宿舍对象数组
 */
const analysisDorms = computed(() => dorms.value.filter(item => (item.school || 'GY') === analysisSchool.value))

/**
 * 构建分析数据列表（按楼栋统计）
 * @returns {Object[]} 楼栋分析数据数组
 */
const analysisList = computed(() => buildAnalysis(analysisDorms.value))

/**
 * 计算分析页的总统计信息（包含房间总数）
 * @returns {Object} 总统计对象
 */
const totalSummary = computed(() => {
  const base = countSummary(analysisDorms.value)
  return {
    ...base,
    rooms: analysisDorms.value.length
  }
})

/**
 * 计算整体触达率百分比
 * @returns {number} 触达率（0-100）
 */
const reachedRate = computed(() => totalSummary.value.beds ? Math.round((totalSummary.value.reached / totalSummary.value.beds) * 100) : 0)

/**
 * 计算整体营销率百分比
 * @returns {number} 营销率（0-100）
 */
const marketedRate = computed(() => totalSummary.value.beds ? Math.round((totalSummary.value.marketed / totalSummary.value.beds) * 100) : 0)

/**
 * 将分析数据按学院分组，并计算每个学院的触达率
 * @returns {Object[]} 学院分组分析数组
 */
const analysisByCollege = computed(() => {
  const map = {}
  analysisList.value.forEach(item => {
    if (!map[item.college]) {
      map[item.college] = { college: item.college, beds: 0, reached: 0, items: [] }
    }
    map[item.college].beds += item.beds
    map[item.college].reached += item.reached
    map[item.college].items.push(item)
  })
  return Object.values(map).map(group => ({
    ...group,
    reachedRate: group.beds ? Math.round((group.reached / group.beds) * 100) : 0
  }))
})

/**
 * 判断当前用户是否可以删除当前房间的记录
 * @returns {boolean} true表示可以删除
 */
const canDeleteActiveRoom = computed(() => {
  if (!activeRoom.value) return false
  return hasOwnRecord(activeRoom.value)
})

/**
 * 判断当前房间的备注是否被锁定（由他人填写时不可修改）
 * @returns {boolean} true表示备注被锁定
 */
const isRemarkLocked = computed(() => Boolean(
  activeRoom.value?.remark
  && (activeRoom.value.remarkOwnerPhone || activeRoom.value.recorderPhone)
  && (activeRoom.value.remarkOwnerPhone || activeRoom.value.recorderPhone) !== user.phone
))

// ==================== 生命周期钩子 ====================

onMounted(async () => {
  // 测试模式：跳过登录，直接进首页（默认给 superAdm 权限）
  if (SKIP_LOGIN_FOR_TEST) {
    Object.assign(user, {
      name: '测试用户',
      phone: '13800138000',
      role: 9
    })
    token.value = 'test-token'
    globalPhone.value = ''
    page.value = 'home'
    isBooting.value = false
    return
  }

  token.value = ''
  globalPhone.value = ''
  page.value = 'login'
  sessionStorage.removeItem('app_token')
  sessionStorage.removeItem('globalPhone')

  // 初始化结束，关闭启动遮罩
  isBooting.value = false
})

// ==================== 隐私协议相关方法 ====================

/**
 * 切换隐私协议勾选状态
 */
function togglePrivacy() {
  agreedPrivacy.value = !agreedPrivacy.value
}

/**
 * 触发隐私协议抖动提示
 * 先移除再添加 class，保证同一动画可重复播放
 */
function shakePrivacy() {
  privacyShake.value = false
  window.setTimeout(() => {
    privacyShake.value = true
  }, 0)
}

/**
 * 校验隐私协议是否已勾选
 * 未勾选则抖动小字提示
 * @returns {boolean} 是否已同意
 */
function ensurePrivacyAgreed() {
  if (agreedPrivacy.value) return true
  shakePrivacy()
  return false
}

// ==================== 数据导入相关方法 ====================

/**
 * 打开数据导入页面
 */
function openImport() {
  if (!canImport.value) {
    Snackbar.warning('暂无数据导入权限')
    return
  }
  page.value = 'import'
}

/**
 * 触发生产人员权限表导入（打开文件选择器）
 */
function triggerUserImport() {
  userImportInput.value?.click()
}

/**
 * 触发宿舍清单列表导入（打开文件选择器）
 */
function triggerDormImport() {
  dormImportInput.value?.click()
}

/**
 * 下载 CSV 文件
 * @param {Array<Array<string>>} rows - 二维数组，包含表头
 * @param {string} filename - 文件名（不含扩展名）
 */
function downloadCsvRows(rows, filename) {
  const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\r\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${reqTime()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * 下载【生产人员权限表】导入模版
 */
function downloadUserTemplate() {
  const rows = [
    ['id', 'phone', 'name', 'role', 'enabled', 'updatedAt'],
    ['系统自增不填', '必填', '必填', '必填', '选填', '选填（导入时请删除示例行）']
  ]
  downloadCsvRows(rows, '生产人员权限表_模版')
  Snackbar.success('模版已下载')
}

/**
 * 下载【宿舍清单列表】导入模版
 */
function downloadDormTemplate() {
  const rows = [
    ['id', 'school', 'college', 'building', 'floor', 'room', 'beds'],
    ['系统自增不填', '必填', '必填', '必填', '必填', '必填', '必填（导入时请删除示例行）']
  ]
  downloadCsvRows(rows, '宿舍清单列表_模版')
  Snackbar.success('模版已下载')
}

/**
 * 解析 CSV 文本为对象数组（首行为表头）
 * @param {string} text - CSV 文本内容
 * @returns {Object[]} 解析后的行对象数组
 */
function parseCsvText(text) {
  const clean = String(text || '').replace(/^\ufeff/, '')
  const lines = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim())
  if (!lines.length) return []

  const splitRow = line => {
    const cells = []
    let cur = ''
    let quoted = false
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"'
          i += 1
        } else if (ch === '"') {
          quoted = false
        } else {
          cur += ch
        }
      } else if (ch === '"') {
        quoted = true
      } else if (ch === ',') {
        cells.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur)
    return cells.map(cell => cell.trim())
  }

  const headers = splitRow(lines[0])
  return lines.slice(1).map(line => {
    const cells = splitRow(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = cells[i] ?? '' })
    return row
  })
}

/**
 * 读取 CSV 文件内容并解析为对象数组
 * @param {File} file - 用户选择的上传文件
 * @returns {Promise<Object[]>} 解析后的行数据
 */
function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(parseCsvText(String(reader.result || '')))
      } catch (err) {
        reject(new Error('文件解析失败，请确认是 CSV 格式'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, 'utf-8')
  })
}

/**
 * 校验生产人员权限表的行数据
 * @param {Object[]} rows - 解析后的行数据
 * @returns {string[]} 错误信息数组，空数组表示全部通过
 */
function validateUserRows(rows) {
  const errors = []
  if (rows.length > 1000) {
    errors.push(`单次导入不能超过 1000 条，当前 ${rows.length} 条`)
    return errors
  }
  const seenPhones = new Set()
  rows.forEach((row, index) => {
    const line = index + 2
    const phone = String(row.phone || '').replace(/\s/g, '')
    if (!/^1\d{10}$/.test(phone)) {
      errors.push(`第 ${line} 行手机号格式错误：${row.phone || '空'}`)
    } else if (seenPhones.has(phone)) {
      errors.push(`第 ${line} 行手机号重复：${phone}`)
    } else {
      seenPhones.add(phone)
    }
    if (!String(row.name || '').trim()) {
      errors.push(`第 ${line} 行 name 不能为空`)
    }
    if (!/^\d+$/.test(String(row.role || '').trim())) {
      errors.push(`第 ${line} 行 role 必须为数字`)
    }
  })
  return errors
}

/**
 * 校验宿舍清单列表的行数据
 * @param {Object[]} rows - 解析后的行数据
 * @returns {string[]} 错误信息数组，空数组表示全部通过
 */
function validateDormRows(rows) {
  const errors = []
  if (rows.length > 5000) {
    errors.push(`单次导入不能超过 5000 条，当前 ${rows.length} 条`)
    return errors
  }
  const seenKeys = new Set()
  rows.forEach((row, index) => {
    const line = index + 2
    const school = String(row.school || 'GY').trim()
    const college = String(row.college || '').trim()
    const building = String(row.building || '').trim()
    const floor = String(row.floor || '').trim()
    const room = String(row.room || '').trim()
    const beds = parseInt(row.beds, 10)

    if (!college) {
      errors.push(`第 ${line} 行 college 不能为空`)
    }
    if (!building) {
      errors.push(`第 ${line} 行 building 不能为空`)
    }
    if (!floor) {
      errors.push(`第 ${line} 行 floor 不能为空`)
    }
    if (!room) {
      errors.push(`第 ${line} 行 room 不能为空`)
    }
    if (!(beds > 0)) {
      errors.push(`第 ${line} 行 beds 必须为正整数：${row.beds || '空'}`)
    }

    if (building && room) {
      const key = `${school}|${building}|${room}`
      if (seenKeys.has(key)) {
        errors.push(`第 ${line} 行同校同楼栋房间重复：${building} ${room}`)
      } else {
        seenKeys.add(key)
      }
    }
  })
  return errors
}

/**
 * 展示导入错误明细弹窗（自定义弹窗，每行一条，超过高度可滚动）
 * @param {string} title - 弹窗标题
 * @param {string[]} errors - 错误信息数组
 */
function showImportErrors(title, errors) {
  const list = Array.isArray(errors) ? errors : []
  // 超过 100 条仅展示前 100 条，避免 DOM 过大卡顿
  const MAX_SHOW = 100
  const shown = list.slice(0, MAX_SHOW)
  if (list.length > MAX_SHOW) {
    shown.push(`…… 以及其余 ${list.length - MAX_SHOW} 条错误，建议分批处理`)
  }
  importErrorTitle.value = title
  importErrorList.value = shown
  importErrorVisible.value = true
}

/**
 * 处理生产人员权限表导入文件
 * @param {Event} event - input change 事件
 */
async function handleUserImportFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (importing.value) return

  if (!/\.csv$/i.test(file.name)) {
    Snackbar.warning('请选择 CSV 文件')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    Snackbar.warning('文件过大，请控制在 2MB 以内')
    return
  }

  importing.value = true
  try {
    const rows = await parseCsvFile(file)
    if (!rows.length) {
      Snackbar.warning('文件内容为空')
      return
    }

    // 前端逐行预检
    const errors = validateUserRows(rows)
    if (errors.length) {
      showImportErrors(`发现 ${errors.length} 处问题`, errors)
      return
    }

    // 通过校验再提交后端
    const result = await importData('user', rows)

    if (result?.failed > 0) {
      showImportErrors(
        `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`,
        result.errors || []
      )
    } else {
      Snackbar.success(`导入成功，共 ${result.success} 条`)
    }
  } catch (error) {
    Snackbar.error(error.message || '导入失败')
  } finally {
    importing.value = false
  }
}

/**
 * 处理宿舍清单列表导入文件
 * @param {Event} event - input change 事件
 */
async function handleDormImportFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (importing.value) return

  if (!/\.csv$/i.test(file.name)) {
    Snackbar.warning('请选择 CSV 文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    Snackbar.warning('文件过大，请控制在 5MB 以内')
    return
  }

  importing.value = true
  try {
    const rows = await parseCsvFile(file)
    if (!rows.length) {
      Snackbar.warning('文件内容为空')
      return
    }

    // 前端逐行预检
    const errors = validateDormRows(rows)
    if (errors.length) {
      showImportErrors(`发现 ${errors.length} 处问题`, errors)
      return
    }

    // 通过校验再提交后端
    const result = await importData('dorm', rows)

    if (result?.failed > 0) {
      showImportErrors(
        `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`,
        result.errors || []
      )
    } else {
      Snackbar.success(`导入成功，共 ${result.success} 条`)
    }
  } catch (error) {
    Snackbar.error(error.message || '导入失败')
  } finally {
    importing.value = false
  }
}

/**
 * 调用后端导入接口
 * @param {'user'|'dorm'} type - 导入类型：user=生产人员权限表，dorm=宿舍清单列表
 * @param {Object[]} rows - 行数据数组
 * @returns {Promise<*>} 接口返回数据
 */
async function importData(type, rows) {
  // 测试模式：不调用真实接口，仅打印日志模拟
  if (SKIP_LOGIN_FOR_TEST) {
    // eslint-disable-next-line no-console
    console.log(`[测试模式] 模拟导入 ${type}，共 ${rows.length} 条：`, rows)
    await new Promise(resolve => window.setTimeout(resolve, 500))
    return { ok: true, total: rows.length, success: rows.length, failed: 0, errors: [] }
  }

  const requestToken = requireLoginToken(token.value)
  await ensureHandle2Crypto()
  const aesKey = createAesKey()
  const funCode = type === 'user' ? IMPORT_USERS_FUNC_CODE : IMPORT_DORMS_FUNC_CODE
  const payload = {
    publicData: {
      reqTime: reqTime(),
      reqSeq: reqSeq(),
      appid: APP_ID,
      activityId: ACTIVITY_ID,
      serviceId: 'ability_customize',
      version: '1.0'
    },
    data: {
      servicecode: GET_CUSTOME_SERVICE_CODE,
      token: requestToken,
      params: {
        funCode,
        token: requestToken,
        rows: JSON.stringify(rows)
      }
    }
  }
  const body = encryptHandle2Payload(payload, aesKey)
  const response = await fetch(HANDLE2_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    throw new Error(`导入失败：${response.status}`)
  }
  const result = await response.json()
  const retInfo = result.publicData?.retInfo
  if (!retInfo || retInfo.retCode !== 0) {
    throw new Error(retInfo?.retMsg || '网关请求失败')
  }
  const decryptedJson = window.decryptAES(result.data, aesKey)
  const bizData = JSON.parse(decryptedJson)
  if (bizData?.result?.result?.retCode !== '0') {
    throw new Error(bizData?.result?.result?.retMsg || '导入失败')
  }
  return bizData?.result?.result?.data
}

// ==================== 登录相关方法 ====================
/**
 * 处理用户登录：仅做验证码鉴权，鉴权成功跳转home，宿舍数据等点击生产登记/分析时再查询
 * 鉴权失败：不跳转、不调用fetchDorms，停留在登录页
 */
async function handleLogin() {
  // 1. 基础格式校验（同步，不进loading）
  if (!/^1\d{10}$/.test(loginPhone.value)) {
    Snackbar.warning('请输入正确的11位手机号')
    return
  }
  if (loginPhone.value !== globalPhone.value) { 
    Snackbar.warning('手机号已变更，请重新获取验证码')
    return
  }

  loginLoading.value = true
  try {
    // 3. 查本系统业务权限
    if (user.phone !== loginPhone.value) {
      const permission = await fetchPermission(loginPhone.value)
      if (!permission || !permission.role) {
        throw new Error('该手机号暂无使用权限')
      }
      Object.assign(user, {
        name: permission.name || `用户${loginPhone.value.slice(-4)}`,
        phone: loginPhone.value,
        role: permission.role
      })
    }

    await ensureHandle2Crypto()
    const aesKey = createAesKey()
    const encryptedMobile = rsaEncrypt(loginPhone.value, HANDLE2_RSA_PUBLIC_KEY)
    const verifyPayload = {
      publicData: {
        reqTime: reqTime(),
        reqSeq: reqSeq(),
        activityId: ACTIVITY_ID,
        appid: APP_ID,
        serviceId: 'ability_acquire_valid_code',
        version: '2.0',
        isTest: IS_TEST
      },
      data: {
        mobile: encryptedMobile,
        code: loginCode.value
      }
    }
    const verifyBody = encryptHandle2Payload(verifyPayload, aesKey)
    const verifyResponse = await fetch(HANDLE2_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: JSON.stringify(verifyBody)
    })
    if (!verifyResponse.ok) {
      throw new Error(`验证码校验失败：${verifyResponse.status}`)
    }
    const verifyResult = await verifyResponse.json()
    const retInfo = verifyResult.publicData?.retInfo
    if (!retInfo || retInfo.retCode !== 0) {
      throw new Error(retInfo?.retMsg || '网关请求失败')
    }
    if (!verifyResult.data || typeof window.decryptAES !== 'function') {
      throw new Error('返回数据异常，无法解密')
    }
    const decryptedJson = window.decryptAES(verifyResult.data, aesKey)
    const bizData = JSON.parse(decryptedJson)
    if (bizData.status !== '0') {
      throw new Error(bizData.msg || '验证码错误或已过期')
    }
    if (!bizData.token) {
      throw new Error('登录成功但未返回 token')
    }

    // 鉴权登录完成，拿到token
    token.value = bizData.token
    // 持久化token
    sessionStorage.setItem('app_token', bizData.token)
    globalPhone.value = ''
    sessionStorage.removeItem('globalPhone')

    // 鉴权成功，先跳转首页，【这里不去await fetchDorms】
    page.value = 'home'

  } catch (error) {
    // 鉴权阶段报错：不跳转，完全不执行fetchDorms，留在登录页
    Snackbar.error(error.message || '登录失败')
    token.value = ''
    sessionStorage.removeItem('app_token') // 清除持久化token
    user.phone = ''
    user.role = 'register'
  } finally {
    loginLoading.value = false
  }
}



// ==================== 验证码加密相关配置与方法 ====================

/** 移动Handle2接口远程地址 */
const HANDLE2_REMOTE_URL = 'https://gd.10086.cn/apph5/openapi/app/handle2'
/**
 * Handle2接口请求地址
 * 开发时经 Vite 同源代理转发，避开浏览器对第三方接口的 CORS 限制。
 * 生产环境请将 VITE_HANDLE2_URL 指向部署服务器上的同源反向代理地址。
 */
const HANDLE2_URL = import.meta.env.VITE_HANDLE2_URL || (import.meta.env.DEV ? '/handle2-api' : HANDLE2_REMOTE_URL)

/** 移动Handle2接口RSA公钥，用于加密AES密钥 */
const HANDLE2_RSA_PUBLIC_KEY = `-----BEGIN RSA PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs4VXnzCnGoOr0camO/kB/KC+cM57FoIHnAVyvUOLgLWTptP76hC/FD/yBjdVHMzcBazkJuTVKvhd5Y+31YNSR3wPjMwus9re7AQdj8DI5RnZdRjXtLfKxG/PC8MlJ98rkZYXg6vp1xyo3Oq9qXJ1ff9WJOAMSAS6dfkzA+qSumw1UzpX1duhAm8QhYAbEW24Leto55uuoUKnS5LXAN8qVe5uKLueb787xQm5NTj2M3eB0w//NTiKlV3g2JsGJv8H0vShQK0ez5bR73dxyrO0qY6Xr2ri6Dp2SHNEjdclohoANkNB649tUgadGId546Fvs0Ln0VzW909LCz4vxMKmsQIDAQAB
-----END RSA PUBLIC KEY-----`

/** 需要动态加载的外部加密脚本列表 */
const HANDLE2_CRYPTO_SCRIPTS = [
  'https://gd.10086.cn/apph5/openapi/static/js/jsencrypt-master/jsencrypt.min.js',
  'https://gd.10086.cn/apph5/openapi/static/js/aes/crypto-min.js',
  'https://gd.10086.cn/apph5/openapi/static/js/aes/aesUtils.js'
]

/** 移动网络一键登录组件脚本 */
const HANDLE2_ONEKEY_LOGIN = [
  'https://gd.10086.cn/apph5/openapi/static/js/jquery.min.js',
  'https://gd.10086.cn/apph5/openapi/static/js/acquire/acquire_min.js',
  'https://gd.10086.cn/apph5/openapi/static/js/acquire/easylogin_min.js'
]

/** 加密组件加载状态的Promise缓存 */
let handle2CryptoReady
/** 一键登录组件加载状态的Promise缓存 */
let handle2OneKeyLoginReady

/**
 * 动态加载外部JavaScript脚本
 * @param {string} src - 脚本URL地址
 * @returns {Promise<void>} 加载完成的Promise
 */
function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve()
      else {
        existing.addEventListener('load', resolve, { once: true })
        existing.addEventListener('error', () => reject(new Error(`脚本加载失败：${src}`)), { once: true })
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
    script.onerror = () => reject(new Error(`脚本加载失败：${src}`))
    document.head.appendChild(script)
  })
}

/**
 * 确保所有加密组件脚本已加载完成
 * @returns {Promise<void>} 全部加载完成的Promise
 */
function ensureHandle2Crypto() {
  if (!handle2CryptoReady) {
    handle2CryptoReady = HANDLE2_CRYPTO_SCRIPTS.reduce(
      (promise, src) => promise.then(() => loadExternalScript(src)),
      Promise.resolve()
    ).then(() => {
      if (typeof window.JSEncrypt !== 'function') throw new Error('RSA 加密组件不可用')
      if (typeof window.encryptAES !== 'function' || typeof window.decryptAES !== 'function') {
        throw new Error('AES 加密组件不可用')
      }
    })
  }
  return handle2CryptoReady
}

/**
 * 确保移动一键登录SDK和Handle2加密组件都已加载完成
 * @returns {Promise<void>} 全部加载完成的Promise
 */
function ensureHandle2OneKeyLogin() {
  if (!handle2OneKeyLoginReady) {
    handle2OneKeyLoginReady = HANDLE2_ONEKEY_LOGIN.reduce(
      (promise, src) => promise.then(() => loadExternalScript(src)),
      Promise.resolve()
    ).then(() => ensureHandle2Crypto()).then(() => {
      if (!window.Login || typeof window.Login.login !== 'function') {
        throw new Error('一键登录组件加载失败')
      }
    })
  }
  return handle2OneKeyLoginReady
}

/**
 * 生成16位随机AES密钥
 * @returns {string} 16位随机字符串
 */
function createAesKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const random = new Uint32Array(16)
  window.crypto.getRandomValues(random)
  return Array.from(random, value => chars[value % chars.length]).join('')
}

/**
 * 使用RSA公钥加密数据
 * @param {string} value - 待加密的明文
 * @param {string} publicKey - RSA公钥字符串
 * @returns {string} RSA加密后的密文
 */
function rsaEncrypt(value, publicKey) {
  const encryptor = new window.JSEncrypt()
  encryptor.setPublicKey(publicKey)
  const encrypted = encryptor.encrypt(value)
  if (!encrypted) throw new Error('RSA 加密失败')
  return encrypted
}

/**
 * 使用AES加密请求载荷，并用RSA加密AES密钥
 * @param {Object} payload - 请求数据对象
 * @param {string} aesKey - AES密钥
 * @returns {Object} 包含加密后data和key的对象
 */
function encryptHandle2Payload(payload, aesKey) {
  if (typeof window.encryptAES !== 'function') {
    throw new Error('AES 加密组件不可用')
  }

  return {
    data: window.encryptAES(JSON.stringify(payload), aesKey),
    key: rsaEncrypt(aesKey, HANDLE2_RSA_PUBLIC_KEY)
  }
}

/**
 * 生成请求时间字符串（格式：YYYYMMDDHHmmSS）
 * @returns {string} 14位时间字符串
 */
function reqTime() {
  const now = new Date()
  const pad = value => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

/**
 * 生成请求序列号（YYYYMMDDHHmmSS + 17位随机字母数字）
 * @returns {string} 唯一序列号
 */
function reqSeq() {
  const now = new Date()
  const pad = value => String(value).padStart(2, '0')
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 17; i += 1) {
    suffix += letters[Math.floor(Math.random() * letters.length)]
  }
  return `${datePart}${suffix}`
}

/**
 * 校验已登录接口需要的token
 * @param {string} value - 登录token
 * @returns {string} 非空token
 */
function requireLoginToken(value) {
  const currentToken = String(value || token.value || '').trim()
  if (!currentToken) throw new Error('登录已失效，请重新登录')
  return currentToken
}

/**
 * 登录前查询手机号权限（ability_customize 方式）
 * @param {string} phone - 11位手机号
 * @returns {Promise<{name: string, phone: string, role: string} | null>}
 */
async function fetchPermission(phone) {
  await ensureHandle2Crypto()
  const aesKey = createAesKey()
  const body = encryptHandle2Payload({
      publicData: {
      reqTime: reqTime(),
      reqSeq: reqSeq(),
      appid: APP_ID,      // 你的 appid
      activityId: ACTIVITY_ID,
      serviceId: 'ability_customize',
      version: '1.0'
    },
    data: {
      servicecode: GET_CUSTOME_SERVICE_CODE,        // ← 自定义函数业务标识
      token: '',                         // 登录前为空
      params: {
        funCode: GET_PERMISSION_FUNC_CODE,
        phone: phone
      }
    }
  }, aesKey)
  const response = await fetch(HANDLE2_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    throw new Error(`权限校验失败：${response.status}`)
  }
  const checkResult = await response.json()
  const retInfo = checkResult.publicData?.retInfo
  if (!retInfo || retInfo.retCode !== 0) {
    throw new Error(retInfo?.retMsg || '网关请求失败')
  }
  if (!checkResult.data || typeof window.decryptAES !== 'function') {
    throw new Error('返回数据异常，无法解密')
  }
  const decryptedJson = window.decryptAES(checkResult.data, aesKey)
  const bizData = JSON.parse(decryptedJson)
  // console.log('bizData1', JSON.stringify(bizData))
  // console.log('retCode', bizData?.result?.result?.retCode)
  if (bizData?.result?.result?.retCode !== '0') {
    throw new Error(bizData?.result?.result?.retMsg)
  }
  // console.log('bizData2', bizData)
  return bizData?.result?.result?.data  // { name, phone, role } 或 null
}

/**
 * 使用一键登录返回的token换取完整手机号
 * @param {string} loginToken - 一键登录返回的token或ssotoken
 * @returns {Promise<string>} 完整11位手机号
 */
async function fetchMobileByToken(loginToken) {
  if (!loginToken) throw new Error('一键登录未返回token，请使用短信登录')
  await ensureHandle2Crypto()
  const aesKey = createAesKey()
  const body = encryptHandle2Payload({
    publicData: {
      reqTime: reqTime(),
      reqSeq: reqSeq(),
      appid: APP_ID,
      activityId: ACTIVITY_ID,
      serviceId: 'ability_customize',
      version: '1.0'
    },
    data: {
      servicecode: GET_CUSTOME_SERVICE_CODE,
      token: loginToken,
      params: {
        funCode: GET_MOBILE_BY_TOKEN_FUNC_CODE,
        token: loginToken
      }
    }
  }, aesKey)
  const response = await fetch(HANDLE2_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    throw new Error(`手机号获取失败：${response.status}`)
  }
  const result = await response.json()
  const retInfo = result.publicData?.retInfo
  if (!retInfo || String(retInfo.retCode) !== '0') {
    throw new Error(retInfo?.retMsg || '网关请求失败')
  }
  if (!result.data || typeof window.decryptAES !== 'function') {
    throw new Error('手机号获取返回异常，无法解密')
  }
  const bizData = JSON.parse(window.decryptAES(result.data, aesKey))
  if (bizData?.result?.result?.retCode !== '0') {
    throw new Error(bizData?.result?.result?.retMsg || 'token换取手机号失败')
  }

  const dataNode = deepParseJsonValue(bizData?.result?.result?.data, {})
  const mobile = normalizeOneClickMobile(dataNode?.mobile || dataNode?.phone || dataNode?.userphone || dataNode?.userPhone || '')
  if (!/^1\d{10}$/.test(mobile)) {
    throw new Error('token未换取到完整手机号，请使用短信登录')
  }
  return mobile
}

/**
 * 发送手机验证码：加载加密组件、加密手机号、调用Handle2接口
 */
async function sendCode() {
  // 未勾选隐私协议：抖动提示，不弹窗
  if (!ensurePrivacyAgreed()) return

  if (!/^1\d{10}$/.test(loginPhone.value)) {
    Snackbar.warning('请先输入正确的手机号')
    return
  }
  codeSending.value = true
  try {
    //判断手机用户是否有登陆权限
    const permission = await fetchPermission(loginPhone.value)
    if (!permission || !permission.hasOwnProperty('role')) {
      Snackbar.error('该手机号暂无使用权限')
      return
    }
    Object.assign(user, {
      name: permission.name || `用户${loginPhone.value.slice(-4)}`,
      phone: loginPhone.value,
      role: permission.role
    })
    // 保存发送验证码时的手机号到内存+会话存储
    globalPhone.value = loginPhone.value
    sessionStorage.setItem('globalPhone', loginPhone.value)

    await ensureHandle2Crypto()
    const aesKey = createAesKey()
    const encryptedMobile = rsaEncrypt(loginPhone.value, HANDLE2_RSA_PUBLIC_KEY)
    const payload = {
      publicData: {
        reqTime: reqTime(),
        reqSeq: reqSeq(),
        activityId: ACTIVITY_ID,
        appid: APP_ID,
        serviceId: 'ability_acquire_send_code',
        version: '2.0',
        isTest: IS_TEST
      },
      data: { mobile: encryptedMobile }
    }
    const body = encryptHandle2Payload(payload, aesKey)
    const response = await fetch(HANDLE2_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) throw new Error(`验证码发送失败：${response.status}`)
    // 先判断网关层是否成功
    const sendCodeResult = await response.json()

    const retInfo = sendCodeResult.publicData?.retInfo
    if (!retInfo || retInfo.retCode !== 0) {
      throw new Error(retInfo?.retMsg || '网关请求失败')
    }
    Snackbar.success('验证码请求已提交')
  } catch (error) {
    Snackbar.error(error.message || '验证码发送失败，请稍后重试')
  } finally {
    codeSending.value = false
  }
}

/**
 * 获取一键登录msgidKey
 * @returns {Promise<string>} 成功返回msgidKey，失败抛出异常
 */
async function getMsgidKey() {
  await ensureHandle2OneKeyLogin()
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = window.setTimeout(() => {
      settled = true
      reject(new Error('一键登录取号超时，请使用短信登录'))
    }, 30000)

    const finishResolve = msgidKey => {
      if (settled) return
      const key = typeof msgidKey === 'string' ? msgidKey : (msgidKey?.msgidKey || msgidKey?.data?.msgidKey || '')
      if (!key) {
        finishReject('一键登录未获取到msgidKey，请使用短信登录')
        return
      }
      settled = true
      window.clearTimeout(timer)
      resolve(key)
    }

    const finishReject = error => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      const message = typeof error === 'string'
        ? error
        : (error?.message || error?.msg || error?.retMsg || '一键登录授权失败，请使用短信登录')
      reject(new Error(message))
    }

    try {
      window.Login.login(finishResolve, finishReject)
    } catch (error) {
      finishReject(error)
    }
  })
}

/**
 * 根据msgidKey调用移动网络一键登录能力，换取本机手机号
 * @param {string} msgidKey - 移动统一认证msgidKey
 * @returns {Promise<{mobile: string, token: string}>}
 */
async function oneClickLogin(msgidKey) {
  if (!msgidKey) throw new Error('一键登录msgidKey为空，请重新授权')
  await ensureHandle2Crypto()
  const aesKey = createAesKey()
  const payload = {
    publicData: {
      reqTime: reqTime(),
      reqSeq: reqSeq(),
      activityId: ACTIVITY_ID,
      appid: APP_ID,
      serviceId: 'ability_acquire_login',
      version: '1.0'
    },
    data: {
      msgidKey
    }
  }
  const body = encryptHandle2Payload(payload, aesKey)
  const response = await fetch(HANDLE2_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify(body)
  })
  if (!response.ok) throw new Error(`一键登录失败：${response.status}`)

  const result = await response.json()
  const retInfo = result.publicData?.retInfo
  if (!retInfo || String(retInfo.retCode) !== '0') {
    throw new Error(retInfo?.retMsg || '网关请求失败')
  }
  if (!result.data || typeof window.decryptAES !== 'function') {
    throw new Error('一键登录返回数据异常，无法解密')
  }

  const bizData = parseOneClickLoginResult(window.decryptAES(result.data, aesKey))
  const bizRetCode = bizData?.result?.result?.retCode ?? bizData?.result?.retCode ?? bizData?.retCode ?? bizData?.code
  if (bizRetCode !== undefined && String(bizRetCode) !== '0') {
    throw new Error(bizData?.result?.result?.retMsg || bizData?.result?.retMsg || bizData?.retMsg || bizData?.msg || '一键登录失败')
  }

  const mobile = normalizeOneClickMobile(findOneClickValue(bizData, ['mobile', 'phone', 'userphone', 'userPhone']))
  const loginToken = findOneClickValue(bizData, ['token', 'ssotoken', 'ssoToken', 'accessToken', 'accesstoken'])
  return {
    mobile,
    token: loginToken || msgidKey
  }
}

/**
 * 本机号码一键登录：移动统一认证取号后，继续校验本系统权限
 */
async function handleOneClickLogin() {
  // 未勾选隐私协议：抖动提示，不进入登录流程
  if (!ensurePrivacyAgreed()) return

  loginLoading.value = true
  try {
    const msgidKey = await getMsgidKey()
    const loginResult = await oneClickLogin(msgidKey)
    const fullMobile = /^1\d{10}$/.test(loginResult.mobile)
      ? loginResult.mobile
      : await fetchMobileByToken(loginResult.token)

    const permission = await fetchPermission(fullMobile)
    if (!permission || !permission.hasOwnProperty('role')) {
      throw new Error('该手机号暂无使用权限')
    }

    Object.assign(user, {
      name: permission.name || `用户${fullMobile.slice(-4)}`,
      phone: fullMobile,
      role: permission.role
    })
    loginPhone.value = fullMobile
    token.value = loginResult.token
    sessionStorage.setItem('app_token', loginResult.token)
    sessionStorage.removeItem('globalPhone')
    page.value = 'home'
  } catch (error) {
    Snackbar.error(error.message || '一键登录失败，请改用短信登录')
  } finally {
    loginLoading.value = false
  }
}

/**
 * 兼容平台返回的多层JSON字符串
 * @param {string} text - 解密后的返回文本
 * @returns {Object} 解析后的业务数据
 */
function parseOneClickLoginResult(text) {
  return deepParseJsonValue(text, {})
}

/**
 * 从一键登录返回中递归查找指定字段
 * @param {*} source - 返回数据
 * @param {string[]} keys - 字段名列表
 * @returns {*} 匹配到的字段值
 */
function findOneClickValue(source, keys) {
  const seen = new Set()
  const stack = [source]
  while (stack.length) {
    const current = deepParseJsonValue(stack.shift(), null)
    if (!current || typeof current !== 'object') continue
    if (seen.has(current)) continue
    seen.add(current)

    for (const key of keys) {
      if (current[key] !== undefined && current[key] !== null && current[key] !== '') {
        return current[key]
      }
    }

    if (Array.isArray(current)) {
      stack.push(...current)
    } else {
      stack.push(...Object.values(current))
    }
  }
  return ''
}

/**
 * 规范化一键登录返回的手机号字段
 * @param {*} value - 手机号原始值
 * @returns {string} 11位手机号或原始文本
 */
function normalizeOneClickMobile(value) {
  const text = String(value ?? '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\s/g, '')
  const match = text.match(/1\d{10}/)
  return match ? match[0] : text
}

// ==================== 数据初始化与刷新 ====================

/**
 * 初始化默认筛选条件：根据第一条宿舍数据设置学校、学院等默认值
 */
function initDefaultFilters() {
  const first = dorms.value[0]
  if (!first) return
  filters.school = first.school || 'GY'
  filters.college = first.college || ''
  filters.building = '全部楼栋'
  filters.floor = '全部'
  analysisSchool.value = filters.school
}

/**
 * 刷新宿舍数据：重新从服务器获取最新数据
 */
async function refreshDorms() {
  dorms.value = await fetchDorms({}, token.value)
  Snackbar.success('已刷新')
}

/**
 * 获取宿舍列表
 * @param {Object} params - 查询参数 { school, college, building, floor }
 * @param {string} token - 登录 token
 * @returns {Promise<Object[]>} 宿舍数组
 */
async function fetchDorms(params = {}, token) {
  const requestToken = requireLoginToken(token)
  await ensureHandle2Crypto()
  const aesKey = createAesKey()
  const payload = {
    publicData: {
      reqTime: reqTime(),
      reqSeq: reqSeq(),
      appid: APP_ID,
      activityId: ACTIVITY_ID,
      serviceId: 'ability_customize',
      version: '1.0'
    },
    data: {
      servicecode: GET_CUSTOME_SERVICE_CODE,
      token: requestToken,
      params: {
        funCode: GET_DORMS_FUNC_CODE,
        token: requestToken,
        ...params
      }
    }
  }

  const body = encryptHandle2Payload(payload, aesKey)
  const response = await fetch(HANDLE2_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`获取宿舍失败：${response.status}`)
  }

  const result = await response.json()
  const retInfo = result.publicData?.retInfo
  if (!retInfo || retInfo.retCode !== 0) {
    throw new Error(retInfo?.retMsg || '网关请求失败')
  }

  // 解密
  const decryptedJson = window.decryptAES(result.data, aesKey)
  const bizData = JSON.parse(decryptedJson)


  if (bizData?.result?.result?.retCode !== '0') {
    throw new Error(bizData?.result?.result?.retMsg)
  }
  return normalizeDormRows(bizData.result.result.data)
}

/**
 * 保存宿舍登记状态（ability_customize 方式）
 * @param {Object} record - 登记状态表字段
 * @param {string} token - 登录 token
 * @returns {Promise<*>}
 */
async function saveRecordByCustomize(record, token) {
  const requestToken = requireLoginToken(token)
  await ensureHandle2Crypto()
  const aesKey = createAesKey()
  const payload = {
    publicData: {
      reqTime: reqTime(),
      reqSeq: reqSeq(),
      appid: APP_ID,
      activityId: ACTIVITY_ID,
      serviceId: 'ability_customize',
      version: '1.0'
    },
    data: {
      servicecode: GET_CUSTOME_SERVICE_CODE,
      token: requestToken,
      params: {
        funCode: SAVE_RECORD_FUNC_CODE,
        token: requestToken,
        ...record
      }
    }
  }

  const body = encryptHandle2Payload(payload, aesKey)
  const response = await fetch(HANDLE2_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`保存失败：${response.status}`)
  }

  const result = await response.json()
  const retInfo = result.publicData?.retInfo
  if (!retInfo || retInfo.retCode !== 0) {
    throw new Error(retInfo?.retMsg || '网关请求失败')
  }

  const decryptedJson = window.decryptAES(result.data, aesKey)
  const bizData = JSON.parse(decryptedJson)

  if (bizData?.result?.result?.retCode !== '0') {
    throw new Error(bizData?.result?.result?.retMsg || '保存自定义函数执行失败')
  }
  return bizData?.result?.result?.data
}

/**
 * 兼容平台返回的列表结构，保证dorms.value始终是数组
 * @param {*} source - 接口返回的数据节点
 * @returns {Object[]} 宿舍数组
 */
function normalizeDormRows(source) {
  const data = parseJsonValue(source, source)
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data?.list)
      ? data.list
      : Array.isArray(data?.records)
        ? data.records
        : Array.isArray(data?.rows)
          ? data.rows
          : Array.isArray(data?.data)
            ? data.data
            : []

  return rows.map(item => {
    const reachedBeds = parseJsonValue(item.reachedBeds, [])
    const marketedBeds = parseJsonValue(item.marketedBeds, [])
    const reachedOwners = parseJsonValue(item.reachedOwners, {})
    const marketedOwners = parseJsonValue(item.marketedOwners, {})

    return {
      ...item,
      id: Number(item.id ?? item.roomId),
      roomId: Number(item.roomId ?? item.id),
      school: item.school || 'GY',
      college: item.college || '无学院',
      building: item.building || '',
      floor: item.floor || '',
      room: item.room || '',
      beds: Number(item.beds || 0),
      reachedBeds: Array.isArray(reachedBeds) ? reachedBeds.map(Number).filter(Boolean) : [],
      marketedBeds: Array.isArray(marketedBeds) ? marketedBeds.map(Number).filter(Boolean) : [],
      reachedOwners: reachedOwners && typeof reachedOwners === 'object' && !Array.isArray(reachedOwners) ? reachedOwners : {},
      marketedOwners: marketedOwners && typeof marketedOwners === 'object' && !Array.isArray(marketedOwners) ? marketedOwners : {},
      remark: item.remark || '',
      remarkOwnerPhone: item.remarkOwnerPhone || item.remarkOwnerPhor || '',
      recorderPhone: item.recorderPhone || item.remarkOwnerPhone || item.remarkOwnerPhor || '',
      updatedAt: item.updatedAt || ''
    }
  })
}

/**
 * 字符串JSON转对象，解析失败返回默认值
 * @param {*} value - 原始值
 * @param {*} fallback - 默认值
 * @returns {*}
 */
function parseJsonValue(value, fallback) {
  if (typeof value !== 'string') return value ?? fallback
  const text = value.trim()
  if (!text) return fallback
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

/**
 * 多解析几层JSON字符串，兼容平台二次序列化后的字段
 * @param {*} value - 原始字段
 * @param {*} fallback - 默认值
 * @returns {*}
 */
function deepParseJsonValue(value, fallback) {
  let current = value
  for (let i = 0; i < 3; i += 1) {
    if (typeof current !== 'string') return current ?? fallback
    const text = current.trim()
    if (!text) return fallback
    try {
      current = JSON.parse(text)
    } catch {
      return current ?? fallback
    }
  }
  return current ?? fallback
}

/**
 * 生成登记状态表入参，只传登记表字段，避免把宿舍基础字段传给保存函数
 * @param {Object} room - 当前宿舍
 * @param {Object} data - 当前登记数据
 * @returns {Object}
 */
function buildRegistrationPayload(room, data) {
  const remarkOwnerPhone = data.remarkOwnerPhone || data.remarkOwnerPhor || ''
  const toDbJson = value => typeof value === 'string' ? value : JSON.stringify(value ?? {})
  return {
    roomId: Number(room.roomId || room.id),
    reachedBeds: toDbJson(data.reachedBeds || []),
    marketedBeds: toDbJson(data.marketedBeds || []),
    reachedOwners: toDbJson(data.reachedOwners || {}),
    marketedOwners: toDbJson(data.marketedOwners || {}),
    remark: data.remark || '',
    remarkOwnerPhone,
    updatedAt: data.updatedAt || new Date().toISOString()
  }
}

/**
 * 导出全部宿舍生产数据（ability_customize 方式）
 * @param {Object} params - 导出筛选参数
 * @param {string} token - 登录 token
 * @returns {Promise<Object[]>}
 */
async function exportAllData(params = {}, token) {
  const requestToken = requireLoginToken(token)
  await ensureHandle2Crypto()
  const aesKey = createAesKey()
  const payload = {
    publicData: {
      reqTime: reqTime(),
      reqSeq: reqSeq(),
      appid: APP_ID,
      activityId: ACTIVITY_ID,
      serviceId: 'ability_customize',
      version: '1.0'
    },
    data: {
      servicecode: GET_CUSTOME_SERVICE_CODE,
      token: requestToken,
      params: {
        funCode: EXPORT_ALL_FUNC_CODE,
        token: requestToken,
        ...params
      }
    }
  }
  const body = encryptHandle2Payload(payload, aesKey)
  const response = await fetch(HANDLE2_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`导出失败：${response.status}`)
  }

  const result = await response.json()
  const retInfo = result.publicData?.retInfo
  if (!retInfo || retInfo.retCode !== 0) {
    throw new Error(retInfo?.retMsg || '网关请求失败')
  }

  const decryptedJson = window.decryptAES(result.data, aesKey)
  const bizData = JSON.parse(decryptedJson)

  if (bizData?.result?.result?.retCode !== '0') {
    throw new Error(bizData?.result?.result?.retMsg || '导出自定义函数执行失败')
  }

  const data = parseJsonValue(bizData.result.result.data, [])
  return Array.isArray(data) ? data : []
}

/**
 * 下载CSV文件，Excel可直接打开
 * @param {Object[]} rows - 导出明细
 */
function downloadExportCsv(rows) {
  const bedRows = normalizeExportBedRows(rows)
  const headers = [
    ['school', '学校'],
    ['college', '学院'],
    ['building', '楼栋'],
    ['floor', '楼层'],
    ['room', '宿舍'],
    ['bedNo', '床位号'],
    ['reachedStatus', '是否触达'],
    ['reachedPhone', '触达手机号'],
    ['marketedStatus', '是否营销'],
    ['marketedPhone', '营销手机号'],
    ['remark', '备注'],
    ['remarkOwnerPhone', '备注归属手机号'],
    ['updatedAt', '更新时间']
  ]
  const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csv = [
    headers.map(([, title]) => escapeCsv(title)).join(','),
    ...bedRows.map(row => headers.map(([key]) => escapeCsv(row[key])).join(','))
  ].join('\r\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `校园生产通导出_${reqTime()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * 将导出数据统一整理为一床位一行
 * @param {Object[]} rows - 后端返回的导出数据
 * @returns {Object[]}
 */
function normalizeExportBedRows(rows) {
  const result = []

  rows.forEach(row => {
    if (row.bedNo !== undefined && row.bedNo !== '') {
      result.push({
        ...row,
        reachedStatus: row.reachedStatus || (row.reachedPhone ? '是' : '否'),
        marketedStatus: row.marketedStatus || (row.marketedPhone ? '是' : '否'),
        remarkOwnerPhone: row.remarkOwnerPhone || row.remarkOwnerPhor || ''
      })
      return
    }

    const bedCount = Number(row.beds || 0)
    const reachedBeds = deepParseJsonValue(row.reachedBeds, [])
    const marketedBeds = deepParseJsonValue(row.marketedBeds, [])
    const reachedOwners = deepParseJsonValue(row.reachedOwners, {})
    const marketedOwners = deepParseJsonValue(row.marketedOwners, {})
    const reachedList = Array.isArray(reachedBeds) ? reachedBeds : []
    const marketedList = Array.isArray(marketedBeds) ? marketedBeds : []
    const reachedMap = reachedOwners && typeof reachedOwners === 'object' && !Array.isArray(reachedOwners) ? reachedOwners : {}
    const marketedMap = marketedOwners && typeof marketedOwners === 'object' && !Array.isArray(marketedOwners) ? marketedOwners : {}

    for (let bedNo = 1; bedNo <= bedCount; bedNo += 1) {
      const reached = reachedList.includes(bedNo) || reachedList.includes(String(bedNo))
      const marketed = marketedList.includes(bedNo) || marketedList.includes(String(bedNo))
      result.push({
        school: row.school || '',
        college: row.college || '',
        building: row.building || '',
        floor: row.floor || '',
        room: row.room || '',
        bedNo,
        reachedStatus: reached ? '是' : '否',
        reachedPhone: reached ? (reachedMap[bedNo] || reachedMap[String(bedNo)] || '') : '',
        marketedStatus: marketed ? '是' : '否',
        marketedPhone: marketed ? (marketedMap[bedNo] || marketedMap[String(bedNo)] || '') : '',
        remark: row.remark || '',
        remarkOwnerPhone: row.remarkOwnerPhone || row.remarkOwnerPhor || '',
        updatedAt: row.updatedAt || ''
      })
    }
  })

  return result
}

/**
 * 下载楼栋进度CSV
 * @param {Object[]} rows - 楼栋进度明细
 */
function downloadBuildingProgressCsv(rows) {
  const headers = [
    ['school', '学校'],
    ['college', '学院'],
    ['building', '楼栋'],
    ['rooms', '宿舍数'],
    ['beds', '床位数'],
    ['reached', '触达成功数'],
    ['marketed', '营销成功数'],
    ['unreached', '待触达数'],
    ['reachedRate', '触达率'],
    ['marketedRate', '营销率']
  ]
  const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csv = [
    headers.map(([, title]) => escapeCsv(title)).join(','),
    ...rows.map(row => headers.map(([key]) => escapeCsv(row[key])).join(','))
  ].join('\r\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `校园生产通楼栋进度_${analysisSchool.value}_${reqTime()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ==================== 页面导航方法 ====================

/**
 * 打开生产登记页面，进入时自动加载宿舍数据
 * @param {Object} [target] - 可选，包含school/college/building的目标对象
 */
async function openRegister(target) {
  if (target) {
    filters.school = target.school || filters.school
    filters.college = target.college
    filters.building = target.building
    filters.floor = '全部'
  }
  
  // 进入 register 页面时加载数据（如果为空或需要刷新）
  if (dorms.value.length === 0) {
    loading.value = true
    try {
      dorms.value = await fetchDorms({}, token.value)
      initDefaultFilters()
    } catch (err) {
      Snackbar.error(err.message || '宿舍数据加载失败，请重试')
      loading.value = false
      return
    } finally {
      loading.value = false
    }
  }
  
  page.value = 'register'
}

/**
 * 打开生产情况分析页面，进入时再加载宿舍数据
 */
async function openAnalysis() {
  if (!canAnalysis.value) {
    Snackbar.warning('暂无生产分析权限')
    return
  }
  if (dorms.value.length === 0) {
    loading.value = true
    try {
      dorms.value = await fetchDorms({}, token.value)
      initDefaultFilters()
    } catch (err) {
      Snackbar.error(err.message || '宿舍数据加载失败，请重试')
      loading.value = false
      return
    } finally {
      loading.value = false
    }
  }

  page.value = 'analysis'
}

/**
 * 打开单个宿舍房间详情页，初始化表单数据
 * @param {Object} room - 宿舍房间数据对象
 */
function openRoom(room) {
  activeRoom.value = room
  form.reachedBeds = [...room.reachedBeds]
  form.marketedBeds = [...room.marketedBeds]
  form.remark = room.remark || ''
  page.value = 'room'
}

// ==================== 床位权限与状态判断方法 ====================

/**
 * 获取指定床位的记录归属人手机号
 * @param {Object} room - 宿舍房间对象
 * @param {string} type - 记录类型：'reached'（触达）或 'marketed'（营销）
 * @param {number} bed - 床位号
 * @returns {string} 归属人手机号，空字符串表示无记录
 */
function getBedOwner(room, type, bed) {
  const ownerMap = type === 'reached' ? room.reachedOwners : room.marketedOwners
  if (ownerMap?.[bed]) return ownerMap[bed]
  const beds = type === 'reached' ? room.reachedBeds : room.marketedBeds
  return beds?.includes(bed) ? room.recorderPhone : ''
}

/**
 * 判断指定床位的触达记录是否被他人锁定（当前用户不可修改）
 * @param {number} bed - 床位号
 * @returns {boolean} true表示被锁定
 */
function isReachedLocked(bed) {
  const owner = getBedOwner(activeRoom.value, 'reached', bed)
  return Boolean(owner && owner !== user.phone)
}

/**
 * 判断指定床位的营销记录是否被他人锁定（当前用户不可修改）
 * @param {number} bed - 床位号
 * @returns {boolean} true表示被锁定
 */
function isMarketedLocked(bed) {
  const owner = getBedOwner(activeRoom.value, 'marketed', bed)
  return Boolean(owner && owner !== user.phone)
}

/**
 * 判断当前用户是否在指定房间有任意记录（触达、营销或备注）
 * @param {Object} room - 宿舍房间对象
 * @returns {boolean} true表示有记录
 */
function hasOwnRecord(room) {
  if (!room) return false
  const hasOwnReached = room.reachedBeds.some(bed => getBedOwner(room, 'reached', bed) === user.phone)
  const hasOwnMarketed = room.marketedBeds.some(bed => getBedOwner(room, 'marketed', bed) === user.phone)
  const hasOwnRemark = Boolean(room.remark && (room.remarkOwnerPhone || room.recorderPhone) === user.phone)
  return hasOwnReached || hasOwnMarketed || hasOwnRemark
}

// ==================== 楼栋统计计算方法 ====================

/**
 * 计算指定楼栋（房间列表）的总床位数
 * @param {Object[]} rooms - 房间对象数组
 * @returns {number} 总床位数
 */
function buildingBedCount(rooms) {
  return rooms.reduce((sum, item) => sum + item.beds, 0)
}

/**
 * 计算指定楼栋（房间列表）的未触达床位数
 * @param {Object[]} rooms - 房间对象数组
 * @returns {number} 未触达床位数
 */
function buildingUnreachedCount(rooms) {
  return rooms.reduce((sum, item) => sum + item.beds - item.reachedBeds.length, 0)
}

// ==================== 表单交互方法 ====================

/**
 * 切换指定床位的触达状态
 * 规则：被他人锁定的不能修改；取消触达时同步取消营销
 * @param {number} bed - 床位号
 */
function toggleReached(bed) {
  if (isReachedLocked(bed)) {
    Snackbar.warning('该床位触达记录由他人保存，不能修改')
    return
  }
  if (form.marketedBeds.includes(bed) && isMarketedLocked(bed)) {
    Snackbar.warning('该床位已有他人营销记录，不能取消触达')
    return
  }
  const index = form.reachedBeds.indexOf(bed)
  if (index >= 0) {
    form.reachedBeds.splice(index, 1)
    const marketedIndex = form.marketedBeds.indexOf(bed)
    if (marketedIndex >= 0) form.marketedBeds.splice(marketedIndex, 1)
  } else {
    form.reachedBeds.push(bed)
  }
}

/**
 * 切换指定床位的营销状态
 * 规则：必须先触达；被他人锁定的不能修改
 * @param {number} bed - 床位号
 */
function toggleMarketed(bed) {
  if (!form.reachedBeds.includes(bed)) return
  if (isMarketedLocked(bed)) {
    Snackbar.warning('该床位营销记录由他人保存，不能修改')
    return
  }
  const index = form.marketedBeds.indexOf(bed)
  if (index >= 0) form.marketedBeds.splice(index, 1)
  else form.marketedBeds.push(bed)
}

// ==================== 数据保存与删除方法 ====================

/**
 * 保存当前房间的登记记录：合并他人数据、设置归属人、提交服务器
 */
async function handleSave() {
  saving.value = true
  try {
    const reachedOwners = {}
    const marketedOwners = {}
    const existingReachedOwners = activeRoom.value.reachedOwners || {}
    const existingMarketedOwners = activeRoom.value.marketedOwners || {}
    const reachedBeds = [...new Set(form.reachedBeds)]
    const marketedBeds = [...new Set(form.marketedBeds)]

    // 保留他人已记录的触达床位（不能删除他人的记录）
    activeRoom.value.reachedBeds.forEach(bed => {
      const owner = getBedOwner(activeRoom.value, 'reached', bed)
      if (owner && owner !== user.phone && !reachedBeds.includes(bed)) reachedBeds.push(bed)
    })
    // 保留他人已记录的营销床位
    activeRoom.value.marketedBeds.forEach(bed => {
      const owner = getBedOwner(activeRoom.value, 'marketed', bed)
      if (owner && owner !== user.phone && !marketedBeds.includes(bed)) marketedBeds.push(bed)
    })
    // 设置每个触达床位的归属人
    reachedBeds.forEach(bed => {
      reachedOwners[bed] = existingReachedOwners[bed] || getBedOwner(activeRoom.value, 'reached', bed) || user.phone
    })
    // 设置每个营销床位的归属人
    marketedBeds.forEach(bed => {
      marketedOwners[bed] = existingMarketedOwners[bed] || getBedOwner(activeRoom.value, 'marketed', bed) || user.phone
    })

    const record = buildRegistrationPayload(activeRoom.value, {
      reachedBeds: reachedBeds.sort((a, b) => a - b),
      marketedBeds: marketedBeds.sort((a, b) => a - b),
      reachedOwners,
      marketedOwners,
      remark: isRemarkLocked.value ? activeRoom.value.remark : form.remark,
      remarkOwnerPhone: isRemarkLocked.value ? activeRoom.value.remarkOwnerPhone : (form.remark ? user.phone : ''),
      updatedAt: new Date().toISOString()
    })
    await saveRecordByCustomize(record, token.value)
    dorms.value = await fetchDorms({}, token.value)
    Snackbar.success('保存成功')
    page.value = 'register'
  } catch (error) {
    Snackbar.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

/**
 * 删除当前房间中当前用户保存的所有记录（触达、营销、备注）
 * 弹出确认对话框，仅清空自己的记录，保留他人的记录
 */
async function handleDelete() {
  const action = await Dialog({
    title: '确认删除',
    message: '删除后只会清空你自己保存的触达、营销和备注记录，是否继续？',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  })

  if (action !== 'confirm') return

  try {
    const reachedOwners = { ...(activeRoom.value.reachedOwners || {}) }
    const marketedOwners = { ...(activeRoom.value.marketedOwners || {}) }
    // 过滤掉当前用户的触达记录
    const reachedBeds = activeRoom.value.reachedBeds.filter(bed => {
      const keep = getBedOwner(activeRoom.value, 'reached', bed) !== user.phone
      if (!keep) delete reachedOwners[bed]
      return keep
    })
    // 过滤掉当前用户的营销记录
    const marketedBeds = activeRoom.value.marketedBeds.filter(bed => {
      const keep = getBedOwner(activeRoom.value, 'marketed', bed) !== user.phone
      if (!keep) delete marketedOwners[bed]
      return keep
    })
    // 判断是否拥有备注所有权
    const ownsRemark = activeRoom.value.remark && (activeRoom.value.remarkOwnerPhone || activeRoom.value.recorderPhone) === user.phone
    await saveRecordByCustomize(buildRegistrationPayload(activeRoom.value, {
      reachedBeds,
      marketedBeds,
      reachedOwners,
      marketedOwners,
      remark: ownsRemark ? '' : activeRoom.value.remark,
      remarkOwnerPhone: ownsRemark ? '' : activeRoom.value.remarkOwnerPhone,
      updatedAt: new Date().toISOString()
    }), token.value)
    dorms.value = await fetchDorms({}, token.value)
    Snackbar.success('已删除记录')
    page.value = 'register'
  } catch (error) {
    Snackbar.error(error.message || '删除失败')
  }
}

// ==================== 数据导出与返回方法 ====================

/**
 * 导出全部数据：调用接口生成Excel文件
 */
async function handleExport() {
  try {
    if (!analysisDorms.value.length) {
      dorms.value = await fetchDorms({}, token.value)
      initDefaultFilters()
    }
    const rows = normalizeExportBedRows(analysisDorms.value)
    if (!rows.length) {
      Snackbar.warning('暂无可导出数据')
      return
    }
    downloadExportCsv(rows)
    Snackbar.success('导出成功')
  } catch (error) {
    Snackbar.error(error.message || '导出失败')
  }
}

/**
 * 导出当前分析页的楼栋进度
 */
function handleBuildingProgressExport() {
  const rows = analysisList.value.map(item => ({
    school: analysisSchool.value,
    college: item.college,
    building: item.building,
    rooms: item.rooms,
    beds: item.beds,
    reached: item.reached,
    marketed: item.marketed,
    unreached: Math.max(item.beds - item.reached, 0),
    reachedRate: item.beds ? `${Math.round((item.reached / item.beds) * 100)}%` : '0%',
    marketedRate: item.beds ? `${Math.round((item.marketed / item.beds) * 100)}%` : '0%'
  }))

  if (!rows.length) {
    Snackbar.warning('暂无可导出的楼栋进度')
    return
  }

  downloadBuildingProgressCsv(rows)
  Snackbar.success('楼栋进度导出成功')
}

/**
 * 页面返回逻辑：从房间页返回登记页并刷新数据，其他情况返回首页
 */
async function goBack() {
  if (page.value === 'room') {
    await refreshDorms()
    page.value = 'register'
    return
  }
  page.value = 'home'
}

// ==================== 筛选器选择方法 ====================

/**
 * 选择学院并重置下级筛选条件
 * @param {string} value - 选中的学院名称
 */
function pickCollege(value) {
  filters.college = value
  filters.building = '全部楼栋'
  filters.floor = '全部'
  showCollegePicker.value = false
}

/**
 * 选择学校并重置所有下级筛选条件
 * @param {string} value - 选中的学校名称
 */
function pickSchool(value) {
  filters.school = value
  filters.college = collegeOptions.value[0] || ''
  filters.building = '全部楼栋'
  filters.floor = '全部'
  showSchoolPicker.value = false
}

/**
 * 选择分析页的学校
 * @param {string} value - 选中的学校名称
 */
function pickAnalysisSchool(value) {
  analysisSchool.value = value
  showAnalysisSchoolPicker.value = false
}

/**
 * 选择楼栋并重置楼层筛选
 * @param {string} value - 选中的楼栋名称
 */
function pickBuilding(value) {
  filters.building = value
  filters.floor = '全部'
  showBuildingPicker.value = false
}

/**
 * 选择楼层
 * @param {string} value - 选中的楼层标识
 */
function pickFloor(value) {
  filters.floor = value
  showFloorPicker.value = false
}

function logout(){
  // 清除持久化存储
  sessionStorage.removeItem('app_token')
  sessionStorage.removeItem('globalPhone')
  // 如果你要全部清空（谨慎，会删掉页面其他业务存的sessionStorage）
  // sessionStorage.clear()

  // 清空vue内存状态
  token.value = ''
  globalPhone.value = ''
  user.name = ''
  user.phone = ''
  user.role = 'register'

  dorms.value = []
  activeRoom.value = null

  // 重置隐私勾选状态
  agreedPrivacy.value = false
  privacyShake.value = false

  // 切回登录页面
  page.value = 'login'
}
</script>