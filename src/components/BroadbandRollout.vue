<template>
 <section class="rollout">
  <header class="ro-heading"><div class="ro-heading-row"><h2>宽带攻坚调度</h2><strong class="ro-location"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0z"/><circle cx="12" cy="10" r="2.5"/></svg>{{ scopeLabel }}</strong></div><div class="ro-meta"><span>◷ {{ data ? `截至 ${data.asOf.label}` : '等待最新小时数据' }}</span><span class="ro-chip">每2小时更新</span><em v-if="isMock">示意数据</em><button class="ro-refresh" :disabled="loading" @click="load(true)" aria-label="刷新宽带攻坚调度">↻<small>刷新</small></button></div></header>
  <section class="ro-filters"><label>分公司<select v-model="filters.branch" @change="changeBranch" :disabled="loading" aria-label="攻坚分公司"><option value="">全市</option><option v-for="b in options.branches" :key="b" :value="b">{{ b }}</option></select></label><label>网格<select v-model="filters.grid" @change="apply" :disabled="loading" aria-label="攻坚网格"><option value="">全部网格</option><option v-for="g in gridOptions" :key="g.grid" :value="g.grid">{{ g.grid }}</option></select></label></section>
  <p v-if="error" class="ro-error" role="alert">{{ error }} <button @click="load(true)">重试</button></p>
  <p v-if="loading" class="ro-loading" role="status">正在读取最新小时归档进度…</p>
  <template v-if="data && !loading">
   <section class="ro-card ro-summary"><h3>{{ data.scope.grid ? `${data.scope.grid}今日手宽归档` : '今日手宽归档' }}</h3><div class="ro-metrics"><div><span>已归档</span><strong class="ro-blue">{{ num(data.summary.capacity) }}<small v-if="has(data.summary.capacity)">条</small></strong></div><div><span>日目标</span><strong>{{ num(data.summary.target) }}<small v-if="has(data.summary.target)">条</small></strong></div><div><span>完成率</span><strong class="ro-blue">{{ pct(data.summary.rate) }}</strong></div><div><span>缺口</span><strong class="ro-orange">{{ num(data.summary.gap) }}<small v-if="has(data.summary.gap)">条</small></strong></div></div><div class="ro-track"><i :style="{width:fill(data.summary.rate)}"></i><b v-if="has(data.summary.rate)">{{ pct(data.summary.rate) }}</b></div><p v-if="!data.scope.grid" class="ro-reached"><svg class="ro-flag" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/></svg><span>已达日目标</span> <b>{{ data.reached }}/{{ data.total }}</b> 网格</p><p v-if="data.missingData || data.missingTarget" class="ro-incomplete">{{ data.missingData ? `待更新产能 ${data.missingData} 个网格` : '' }} {{ data.missingTarget ? `缺少有效日目标 ${data.missingTarget} 个网格，暂不参与排名` : '' }}</p></section>
   <section v-if="!data.scope.branch && !data.scope.grid" class="ro-card"><h3>分公司进度</h3><table class="ro-table"><thead><tr><th>分公司</th><th>今日归档</th><th>日目标</th><th>完成率</th><th>缺口</th></tr></thead><tbody><tr v-for="b in data.branches" :key="b.branch"><th><button @click="selectBranch(b.branch)">{{ b.branch.replace('分公司','') }} ›</button></th><td>{{ num(b.capacity) }}</td><td>{{ num(b.target) }}</td><td :class="branchTone(b)">{{ pct(b.rate) }}</td><td :class="belowCity.some(r=>r.branch===b.branch)?'ro-red':'ro-orange'">{{ num(b.gap) }}</td></tr></tbody></table><p class="ro-branch-legend">完成率低于全市的分公司标红。</p></section>
   <template v-if="!data.scope.grid">
    <section class="ro-card"><h3>ABC类网格整体情况</h3><div class="ro-classes"><div v-for="c in data.classes" :key="c.category" :class="['ro-class-'+c.category,{'ro-class-empty':!has(c.rate)}]"><div><b>{{ c.category }}类网格</b></div><strong>{{ pct(c.rate) }}</strong></div></div></section>
    <section class="ro-card ro-focus"><h3>需补产网格</h3><p class="ro-sub">按全市同类日目标完成率选取，展示当前范围</p><div v-for="c in ['A','B','C']" :key="c" class="ro-focus-row"><b>{{ c }}类</b><div><template v-if="focusRows(c).length"><button v-for="r in focusRows(c)" :key="r.grid" @click="selectGrid(r)">{{ r.grid }} <strong :class="r.capacity===0?'ro-red':'ro-orange'">{{ pct(r.rate) }}</strong></button></template><span v-else>当前范围暂无入选网格</span></div></div><p class="ro-sub">全市关注范围：A类2个、B类3个、C类4个；同率按名称排序。</p></section>
    <section class="ro-card"><div class="ro-list-heading"><h3>{{ data.scope.branch ? '所属网格进度' : '网格进度' }}</h3><div class="ro-tabs" aria-label="网格类别"><button v-for="c in ['', 'A','B','C']" :key="c" :class="{active:category===c}" @click="category=c">{{ c ? `${c}类` : '全部' }}</button></div></div><label class="ro-sort">排序：<select v-model="sortOrder" aria-label="网格完成率排序"><option value="desc">完成率从高到低</option><option value="asc">完成率从低到高</option></select></label><table class="ro-table ro-grid-table"><thead><tr><th>网格</th><th>类别</th><th>今日归档</th><th>日目标</th><th>完成率</th><th>缺口</th></tr></thead><tbody><tr v-for="r in displayedGridRows" :key="r.grid"><th><button @click="selectGrid(r)">{{ r.grid }}</button></th><td><span class="ro-class-badge" :class="'ro-badge-'+r.category">{{ r.category }}</span></td><td :class="{ 'ro-red':r.capacity===0 }">{{ num(r.capacity) }}</td><td>{{ num(r.target) }}</td><td :class="r.focused ? 'ro-red ro-below-rate' : tone(r.rate)">{{ pct(r.rate) }}</td><td :class="r.focused ? 'ro-red' : 'ro-orange'">{{ num(r.gap) }}</td></tr></tbody></table><p v-if="!gridRows.length" class="ro-sub">暂无</p><button v-if="!category && !data.scope.branch && gridRows.length>5" class="ro-expand" @click="showAll=!showAll">{{ showAll ? '收起网格列表' : `查看全部${gridRows.length}个网格 ›` }}</button></section>
   </template>
   <template v-else>
    <section class="ro-card"><h3>同类进度定位</h3><div class="ro-peer"><b>{{ data.summary.category }}类网格</b><template v-if="data.peer"><span>全市同类排名<strong>{{ data.peer.rank ? `第${data.peer.rank} / ${data.peer.count}` : '暂无可评估排名' }}</strong></span><span>全市同类完成率<strong>{{ pct(data.peer.summary.rate) }}</strong></span></template><span v-else>当前权限仅展示本网格数据</span></div></section>
    <section class="ro-card ro-grid-focus"><h3>需补产网格</h3><strong v-if="data.summary.focused">已纳入{{ data.summary.category }}类需补产网格</strong><strong v-else>{{ !has(data.summary.rate) ? '日目标或产能待完善' : data.summary.rate>=100 ? '已完成日目标' : '持续推进当日归档' }}</strong><p v-if="has(data.summary.gap)">距日目标还差 <b>{{ num(data.summary.gap) }}</b> 条</p><p v-else>日目标缺口：暂无</p></section><button class="ro-back" @click="backToBranch">‹ 返回所属分公司</button>
   </template>
   <footer class="ro-actions"><button :disabled="exporting" @click="copyReport">复制补产通报</button><button :disabled="exporting" @click="download">{{ exporting?'正在导出…':'导出进度表' }}</button></footer><p class="ro-sub">口径：当天截至该小时累计手宽归档量；日目标读取对应区域配置，以数据截至时间为准。</p><p v-if="message" class="ro-message" role="status">{{ message }}</p>
  </template>
 </section>
</template>
<script setup>
import {computed,onMounted,onUnmounted,reactive,ref,watch} from 'vue'
import {isMock} from '../api/client.js'
import {fetchHourlyBroadband} from '../api/hourlyBroadband.js'
import {hourlyNumber,hourlyHasNumber,hourlyFormat,hourlyPercent,hourlyFill,hourlyGridOrder,hourlyBelowCity} from '../utils/hourlyBroadbandDisplay.js'
import {hourlyReport,exportHourlyBroadband} from '../utils/hourlyBroadbandExport.js'
const props=defineProps({permission:{type:Object,required:true},token:{type:String,default:''},navigationState:{type:Object,default:null}})
const emit=defineEmits(['navigation-change'])
const filters=reactive({branch:props.navigationState?.branch||'',grid:props.navigationState?.grid||''}),data=ref(null),loading=ref(false),error=ref(''),message=ref(''),exporting=ref(false),category=ref('')
const options=ref({branches:[],grids:[]}),scopeLabel=computed(()=>filters.grid||filters.branch||'中山市'),gridOptions=computed(()=>options.value.grids.filter(g=>!filters.branch||g.branch===filters.branch))
const num=hourlyFormat,pct=hourlyPercent,fill=hourlyFill,has=hourlyHasNumber
const tone=v=>!has(v)?'ro-muted':hourlyNumber(v)>=100?'ro-green':'ro-orange'
const sortOrder=ref('asc'),showAll=ref(false)
const gridRows=computed(()=>hourlyGridOrder((data.value?.grids||[]).filter(r=>!category.value||r.category===category.value),sortOrder.value))
const displayedGridRows=computed(()=>!category.value&&!data.value?.scope.branch&&!showAll.value?gridRows.value.slice(0,5):gridRows.value)
const belowCity=computed(()=>hourlyBelowCity(data.value))
const focusRows=c=>(data.value?.focus||[]).filter(r=>r.category===c)
function branchTone(b){return !has(b.rate)?'ro-muted':belowCity.value.some(r=>r.branch===b.branch)?'ro-red ro-below-rate':'ro-blue'}
let sequence=0,timer
async function load(force=false){
 const request=++sequence,token=props.token;loading.value=true;error.value='';message.value=''
 try{const result=await fetchHourlyBroadband({...filters},token,force);if(request!==sequence||token!==props.token)return;data.value=result;options.value=result.options;filters.branch=result.scope.branch;filters.grid=result.scope.grid;emit('navigation-change',{...filters})}
 catch(e){if(request===sequence){data.value=null;error.value=e.message||'小时归档数据读取失败'}}finally{if(request===sequence)loading.value=false}
}
function apply(){showAll.value=false;category.value='';emit('navigation-change',{...filters});load()}
function changeBranch(){filters.grid='';apply()}
function selectBranch(branch){filters.branch=branch;filters.grid='';apply();window.scrollTo(0,0)}
function selectGrid(r){filters.branch=r.branch;filters.grid=r.grid;apply();window.scrollTo(0,0)}
function backToBranch(){filters.grid='';apply()}
async function copyReport(){try{await navigator.clipboard.writeText(hourlyReport(data.value));message.value='补产通报已复制'}catch(e){message.value='复制不可用，请使用导出进度表'}}
async function download(){exporting.value=true;try{await exportHourlyBroadband(data.value,isMock);message.value='进度表已导出'}catch(e){message.value=e.message||'导出失败'}finally{exporting.value=false}}
watch(()=>props.navigationState,n=>{if(n && (n.branch!==filters.branch || n.grid!==filters.grid)){filters.branch=n.branch||'';filters.grid=n.grid||'';load()}},{deep:true})
watch(category,()=>{showAll.value=false})
onMounted(()=>{load();timer=setInterval(()=>{if(document.visibilityState==='visible'&&!loading.value)load(true)},60000)})
onUnmounted(()=>{sequence++;clearInterval(timer)})
</script>
<style scoped>
.rollout{--ro-font:Arial,"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;font-family:var(--ro-font);padding:12px 0 26px;color:#142e53}
.rollout :is(button,input,select,table,thead,tbody,tr,th,td,strong,b,span,small){font-family:var(--ro-font)}
.ro-heading,.ro-card,.ro-filters{border:1px solid #c9e2ff;border-radius:13px;background:linear-gradient(115deg,#fff,#f8fcff);margin-bottom:14px;overflow:hidden}
.ro-heading{padding:12px 0 10px}.ro-heading-row{display:flex;align-items:center;gap:9px}
.ro-heading h2{margin:0;flex:0 0 auto;color:#fff;background:linear-gradient(110deg,#0878fa,#00add8);clip-path:polygon(0 0,100% 0,91% 100%,0 100%);font-size:clamp(18px,4.8vw,28px);font-weight:800;padding:9px 23px 9px 12px;white-space:nowrap;line-height:1.3}
.ro-tagline{font-size:clamp(10px,2.25vw,14px);font-weight:700;flex:1;color:#142e53;line-height:1.7;min-width:0}
.ro-location{font-size:clamp(12px,2.8vw,17px);display:flex;align-items:center;gap:4px;padding-right:12px;max-width:32%;line-height:1.4}
.ro-location svg{width:17px;height:20px;fill:none;stroke:currentColor;stroke-width:2;flex:none}
.ro-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:9px 12px 0;font-size:clamp(11px,2.65vw,14px);color:#607b9a;font-weight:500}
.ro-chip{border-radius:9px;background:#dff0ff;color:#0878fa;padding:2px 7px;font-size:11px;white-space:nowrap}
.ro-meta em{font-style:normal;color:#0878fa;font-size:10px}
.ro-refresh{margin-left:auto;border:1px solid #a9d1ff;border-radius:7px;background:#fff;color:#0878fa;display:flex;gap:4px;align-items:center;padding:3px 7px;font-size:20px;line-height:1}
.ro-refresh small{font-size:11px;font-weight:700}
.ro-filters{display:flex;gap:14px;padding:11px 12px;background:transparent;border-color:transparent;border-radius:0;margin-bottom:5px}
.ro-filters label{display:flex;align-items:center;gap:7px;flex:1;min-width:0;font-size:14px;font-weight:700;white-space:nowrap}
.ro-filters select{width:100%;min-width:0;padding:8px 5px;border:1px solid #b8d0ef;border-radius:6px;color:#193a61;background:white;font-size:14px;font-weight:700}
.ro-card{padding:14px}.ro-card h3{display:flex;align-items:center;gap:8px;font-size:clamp(17px,3.8vw,23px);line-height:1.4;font-weight:800;margin:0 0 13px;color:#142e53;background:none;clip-path:none;padding:0}
.ro-card h3::before{content:"";width:4px;height:21px;border-radius:3px;background:linear-gradient(#00b9ff,#0864ff);flex:none}
.ro-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));text-align:center;margin:10px 0 17px}
.ro-metrics>div+div{border-left:1px solid #c7d8ee}.ro-metrics span{display:block;font-size:13px;font-weight:600;margin-bottom:8px}
.ro-metrics strong{font-size:clamp(22px,6.1vw,36px);font-weight:800;letter-spacing:-.5px;white-space:nowrap;line-height:1.25}
.ro-metrics small{font-size:12px;margin-left:3px;font-weight:700;letter-spacing:0}
.ro-track{height:14px;background:#d3e2f2;border-radius:10px;overflow:hidden;position:relative}
.ro-track i{display:block;height:100%;background:linear-gradient(90deg,#00b9ed,#0062ff);border-radius:inherit}
.ro-track b{position:absolute;inset:0;text-align:center;color:#fff;font-size:11px;line-height:14px;font-weight:700;text-shadow:0 1px 2px #0057ad80}
.ro-reached{background:#e2f0ff;border-radius:7px;text-align:center;padding:8px;margin:11px 0 0;font-size:13px;font-weight:600}.ro-reached b{color:#0768f8;font-weight:800}
.ro-blue{color:#0768f8}.ro-green{color:#008c42}.ro-orange{color:#f47b0c}.ro-red{color:#eb213d}.ro-muted{color:#8192a7}
.ro-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:clamp(12px,2.9vw,16px);text-align:center;line-height:1.4}
.ro-table th,.ro-table td{padding:8px 2px;border-bottom:1px solid #dae7f5;overflow-wrap:normal;font-weight:700;font-variant-numeric:tabular-nums}
.ro-table thead{background:#e0edfc}.ro-table thead th{font-size:clamp(11px,2.7vw,15px);color:#173956;font-weight:700;padding-top:8px;padding-bottom:8px;white-space:nowrap}
.ro-table button{font:inherit;font-weight:700;background:none;border:0;padding:0;color:#142e53;text-align:inherit}
.ro-table tbody tr:last-child th,.ro-table tbody tr:last-child td{border-bottom:0}
.ro-grid-table th:first-child{width:20%}.ro-grid-table th:nth-child(2){width:10%}.ro-grid-table th:nth-child(5){width:19%}
.ro-class-badge{border-radius:4px;display:inline-block;min-width:24px;padding:1px 4px;line-height:1.2;color:#327bcc;background:#e5f1ff;font-weight:700}.ro-badge-A{background:#e5f7e6;color:#168845}.ro-badge-C{background:#fff0db;color:#bd741a}
.ro-classes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.ro-classes>div{padding:10px 9px;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0}
.ro-classes .ro-class-A{background:#e5f6ec;color:#087e32}.ro-classes .ro-class-B{background:#e5f0ff;color:#0969f6}.ro-classes .ro-class-C{background:#fff0de;color:#ee7908}
.ro-classes>div>div{min-width:0;flex:1}.ro-classes b{font-size:clamp(11px,2.6vw,15px);color:#173950;font-weight:700;white-space:normal}.ro-classes small{display:block;font-size:clamp(9px,1.8vw,11px);color:#58768d;margin-top:4px;white-space:normal}
.ro-classes strong{font-size:clamp(18px,3.5vw,25px);font-weight:800;white-space:nowrap;letter-spacing:-.6px;flex:none}.ro-classes .ro-class-empty strong{color:#8795a8;font-size:17px;letter-spacing:0}
.ro-sub{font-size:11px;color:#7b90ab;line-height:1.7;margin:8px 0}.ro-focus>.ro-sub{font-size:10px;margin-top:-5px;margin-bottom:10px}.ro-focus>.ro-sub:last-child{margin:9px 0 0}
.ro-focus-row{display:flex;gap:10px;border-radius:7px;background:#fff2e1;margin:6px 0;padding:8px;font-size:13px;font-weight:600}
.ro-focus-row>b{flex:0 0 36px;color:#a7540c;border-right:1px solid #edb979;display:flex;align-items:center;font-size:14px}
.ro-focus-row>div{display:flex;flex-wrap:wrap;gap:7px 15px;align-items:center;min-width:0;flex:1}.ro-focus-row button{font:inherit;color:#173956;background:none;border:0;padding:0;line-height:1.5;white-space:nowrap}.ro-focus-row strong{margin-left:5px;font-weight:800}.ro-focus-row span{color:#8a95a6;font-size:11px;font-weight:400}
.ro-list-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.ro-list-heading h3{margin-bottom:0}
.ro-tabs{display:flex;border:1px solid #c2d7f0;border-radius:6px;background:#f1f7ff;overflow:hidden}.ro-tabs button{font-size:12px;border:0;background:none;color:#365875;padding:5px 9px;font-weight:700;line-height:1.25}.ro-tabs button+button{border-left:1px solid #c7d9ee}.ro-tabs button.active{background:#0878fa;color:white;border-radius:5px}
.ro-sort{display:flex;align-items:center;justify-content:flex-end;gap:3px;flex-wrap:wrap;width:100%;margin:10px 0 10px;font-size:11px;font-weight:600;color:#58728f;line-height:1.5}
.ro-sort select{background:transparent;border:0;max-width:100%;min-width:0;color:#244567;font:inherit;line-height:1.5;padding:2px 0;font-weight:600}
.ro-peer{display:flex;align-items:center;gap:12px;font-size:12px;flex-wrap:wrap}.ro-peer>b{padding:9px;background:#e8f1ff;border-radius:8px}.ro-peer span{flex:1;min-width:90px;color:#6f86a2}.ro-peer strong{display:block;font-size:22px;color:#0878fa;margin-top:8px;font-weight:800}
.ro-grid-focus{background:#fff4e9}.ro-grid-focus>strong{font-size:18px;color:#ae570d}.ro-grid-focus p{font-size:15px}.ro-actions{display:flex;gap:12px;margin-top:18px}
.ro-actions button,.ro-back{flex:1;border:1px solid #0878fa;border-radius:8px;padding:12px 5px;background:#fff;color:#0878fa;font-size:14px;font-weight:700}.ro-actions button:first-child{background:linear-gradient(100deg,#0889ff,#0062ff);color:#fff}.ro-back{display:block;margin:auto;max-width:220px;width:100%}
.ro-error,.ro-notice{padding:12px;background:#fff0ee;color:#ba5932;line-height:1.8;font-size:13px;border-radius:9px}.ro-loading{color:#6f8aa7;text-align:center;padding:20px}.ro-incomplete{font-size:11px;color:#b47a43}.ro-message{font-size:13px;color:#0878fa}button:disabled{opacity:.55}select:disabled{opacity:.8}
@media(max-width:440px){.ro-classes>div{display:grid;grid-template-columns:minmax(0,1fr) auto;padding:9px 6px;gap:5px 3px}.ro-classes>div>div{display:contents}.ro-classes b{grid-column:1/-1;grid-row:1;font-size:11px}.ro-classes small{grid-column:1;grid-row:2;font-size:8px;max-width:24px;white-space:normal;margin:0;line-height:1.3}.ro-classes strong{grid-column:2;grid-row:2;font-size:18px}.ro-location{font-size:12px;gap:2px;padding-right:8px}.ro-location svg{width:14px}}
@media(max-width:360px){.ro-filters{gap:9px;padding:10px 4px}.ro-filters label{font-size:12px;gap:4px}.ro-filters select{font-size:12px}.ro-card{padding:12px 10px}.ro-metrics strong{font-size:21px}.ro-metrics span{font-size:11px}.ro-metrics small{font-size:10px;margin-left:1px}.ro-table{font-size:11px}.ro-table thead th{font-size:10px}.ro-heading-row{gap:6px}.ro-heading h2{font-size:17px;padding-left:9px;padding-right:20px}.ro-tagline{font-size:9px}.ro-meta{font-size:10px;padding-left:9px;padding-right:9px;gap:5px}.ro-chip{font-size:10px;padding:2px 5px}.ro-classes>div{display:flex;flex-direction:column;align-items:flex-start;padding:9px 8px}.ro-classes b{font-size:12px}.ro-classes small{font-size:9px;max-width:none;white-space:nowrap}.ro-classes strong{font-size:22px;letter-spacing:0}.ro-focus-row{font-size:12px;padding:7px}.ro-focus-row>div{gap:7px 10px}.ro-tabs button{padding:5px 7px}.ro-list-heading h3{font-size:16px}}
.ro-below-rate{background:#fff0dd;border-radius:4px}.ro-below-city{margin-top:12px;padding:10px;background:#fff3e5;border-radius:8px;display:flex;flex-wrap:wrap;align-items:center;gap:7px 12px;font-size:11px;color:#ab6427;line-height:1.6}.ro-below-city>b{width:100%;font-weight:600}.ro-below-city button{display:flex;align-items:baseline;flex-wrap:wrap;gap:5px;border:0;padding:0;color:#db6b05;background:none;font:inherit}.ro-below-city strong{font-weight:700}.ro-below-city span{color:#a76f3e}
.ro-expand{display:block;margin:11px auto 0;border:0;background:none;color:#0768f8;font:inherit;font-size:13px;font-weight:700;padding:6px 12px}

/* Requested refinements: category labels only, SVG flag and one branch per line. */
.ro-heading-row{justify-content:space-between}.ro-location{margin-left:auto;max-width:45%;padding-right:16px}
.ro-reached{display:flex;align-items:center;justify-content:center;gap:6px}.ro-flag{width:21px;height:24px;fill:none;stroke:#0768f8;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.ro-metrics{column-gap:3px;margin-top:16px;margin-bottom:20px}.ro-metrics>div{min-width:0;padding:0 3px}.ro-metrics strong{font-size:clamp(21px,5.1vw,32px);letter-spacing:-.6px}.ro-metrics small{font-size:11px;margin-left:2px}.ro-metrics span{margin-bottom:10px}
.ro-below-rate{background:#ffe8ee;color:#e52748}.ro-below-city{display:grid;grid-template-columns:minmax(0,1fr);gap:0;padding:12px 13px;background:#fff0f3;color:#a94358;font-size:12px}.ro-below-city>b{padding:0 0 7px;font-weight:600}.ro-below-city button{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:3px 10px;width:100%;padding:8px 0;color:#e52748;font-size:12px;text-align:left}.ro-below-city button+button{border-top:1px solid #f4dce2}.ro-below-city strong{font-size:13px;font-weight:700}.ro-below-city span{color:#bc566c;font-size:11px}
.ro-classes>div{display:flex;flex-direction:row;align-items:center;justify-content:space-between;padding:12px 10px;gap:6px}.ro-classes>div>div{display:block;flex:0 0 auto;min-width:0}.ro-classes b{font-size:clamp(12px,2.6vw,15px);white-space:nowrap}.ro-classes strong{font-size:clamp(20px,4.3vw,28px);line-height:1.2;letter-spacing:-.7px}
@media(max-width:480px){.ro-classes>div{flex-direction:column;align-items:flex-start;gap:9px;padding:11px 9px}.ro-classes b{font-size:12px}.ro-classes strong{font-size:24px;letter-spacing:-.5px}.ro-classes .ro-class-empty strong{font-size:20px}.ro-metrics strong{font-size:clamp(21px,5.5vw,25px)}.ro-location{font-size:14px}}
@media(max-width:360px){.ro-metrics{column-gap:1px}.ro-metrics>div{padding:0 2px}.ro-metrics strong{font-size:20px;letter-spacing:-.5px}.ro-metrics small{font-size:9px;margin-left:1px}.ro-meta{gap:5px}.ro-chip{font-size:9px}.ro-location{font-size:12px;padding-right:10px}.ro-below-city{padding:10px;font-size:11px}}


.ro-branch-legend{margin:10px 0 0;font-size:11px;line-height:1.7;color:#7b90ab;font-weight:400}
.ro-classes>div{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:9px;padding:13px 9px}
.ro-classes>div>div{display:block;flex:0 0 auto;width:100%;text-align:center}
.ro-classes b,.ro-classes strong{display:block;width:100%;text-align:center}


</style>
