<template>
  <article class="own-result">
    <header class="own-heading"><span class="own-avatar" aria-hidden="true"><img :src="personIcon" alt="" /></span><div><h3>{{ item.name }}</h3><div class="identity-meta"><span class="own-role">{{ item.role || '自有人员' }}</span><span class="code">{{ item.code }}</span></div><p>{{ item.branchId }} · {{ item.gridId?.split('::').slice(1).join('::') }}</p></div></header>
    <div class="total-heading"><strong>本人＋所管对象总产能</strong><span>工号、渠道编码分别去重</span></div>
    <div class="table-wrap"><table><thead><tr><th>产品</th><th>当日</th><th>本月</th><th>上月同期</th></tr></thead><tbody><template v-for="value in item.values" :key="value.productId"><tr><th>{{ value.productName }}</th><td>{{ format(value.day) }}<small>{{ value.unit }}</small></td><td class="month">{{ format(value.month) }}<small>{{ value.unit }}</small></td><td>{{ format(value.previous) }}<small>{{ value.unit }}</small></td></tr><tr class="comparison"><td colspan="4" :class="{down:change(value)<0,up:change(value)>0}">{{ comparison(value) }}</td></tr></template></tbody></table></div>
    <details open class="own-details"><summary>本人及所管明细 <span>{{ item.children?.length || 0 }} 个对象</span></summary>
      <section v-for="child in item.children" :key="child.key" class="child-card">
        <header><strong>{{ child.name }}</strong><span class="relation" :class="{'relation-self':child.relation === '本人','relation-channel':child.entityType === 'channel'}">{{ child.relation }}</span></header>
        <div class="identity-meta"><span :class="child.relation === '本人' ? 'own-role' : 'child-role'">{{ child.role || (child.entityType === 'channel' ? '渠道' : '人员') }}</span><span class="code">{{ child.code }}</span></div>
        <p class="child-location">{{ child.branchId }} · {{ child.gridId?.split('::').slice(1).join('::') }}</p>
        <div class="table-wrap"><table><thead><tr><th>产品</th><th>当日</th><th>本月</th><th>上月同期</th></tr></thead><tbody><tr v-for="value in child.values" :key="value.productId"><th>{{ value.productName }}</th><td>{{ format(value.day) }}</td><td class="month">{{ format(value.month) }}</td><td>{{ format(value.previous) }}</td></tr></tbody></table></div>
      </section>
    </details>
  </article>
</template>
<script setup>
import { compareSearchTotals } from '../utils/searchTotalsComparison.js'
import personIcon from '../assets/ui-icons/user-round.svg'
defineProps({item:Object})
const format = v => v == null ? '—' : Number(v).toLocaleString('zh-CN',{maximumFractionDigits:2})
const change = v => compareSearchTotals(v).difference
function comparison(v){
  const {difference,rate}=compareSearchTotals(v)
  if(difference == null)return '较上月同期：暂无可比数据'
  return `较上月同期 ${difference>0?'+':''}${format(difference)} ${v.unit}${rate==null?'（上期为0，变化率不适用）':`（${rate>0?'+':''}${format(rate)}%）`}`
}
</script>
<style scoped>
.own-result{margin-top:14px;padding:18px 16px;border:1px solid #dce6f5;border-radius:12px;background:#fff;color:#142349}.own-heading{display:flex;align-items:flex-start;gap:12px}.own-avatar{display:grid;place-items:center;width:48px;height:48px;flex:none;border-radius:50%;background:#f0eaff;color:#8054be;font-size:23px;font-weight:700}.own-heading h3{margin:0;font-size:20px}.identity-meta{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:7px;font-size:12px}.own-role,.child-role{padding:3px 7px;border-radius:5px;line-height:1.4}.own-role{background:#f0eaff;color:#7950ac;border:1px solid #dfcef8}.child-role{background:#edf5ff;color:#2677d9}.code{color:#7188a0;overflow-wrap:anywhere}.own-heading p,.child-location{font-size:12px;color:#607998;margin:8px 0;line-height:1.6}.total-heading{display:flex;flex-wrap:wrap;gap:6px;justify-content:space-between;margin-top:20px;font-size:14px}.total-heading>span{font-size:11px;color:#8194ad}.table-wrap{overflow:hidden;margin-top:10px;border:1px solid #e6eef9;border-radius:8px}table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:13px}th,td{padding:10px 6px;border-bottom:1px solid #edf1f7;text-align:right;overflow-wrap:anywhere;font-weight:500}th:first-child{width:29%;text-align:left}thead{background:#f0f7fe;color:#607998;font-size:12px}td{color:#607998;white-space:nowrap}.month{color:#1672fa;font-weight:700}small{font-size:10px;margin-left:2px}.comparison td{text-align:left;white-space:normal;background:#f8fbff;font-size:12px;font-weight:600}.comparison .down{color:#c47721}.comparison .up{color:#099d87}.own-details{margin-top:18px;border-top:1px solid #e7eef8}.own-details summary{padding:16px 0 5px;cursor:pointer;font-weight:700;font-size:14px}.own-details summary>span{float:right;font-size:12px;color:#7188a0;font-weight:400}.child-card{margin-top:12px;padding:12px;background:#fbfdff;border:1px solid #e4edf9;border-radius:9px}.child-card header{display:flex;align-items:baseline;gap:9px;justify-content:space-between}.child-card header strong{font-size:15px;overflow-wrap:anywhere}.relation{flex:none;padding:3px 6px;border-radius:4px;background:#eaf3ff;color:#3278c7;font-size:11px}.relation-self{background:#f0eaff;color:#7950ac}.relation-channel{background:#e5f6f0;color:#15947e}.child-card table{font-size:12px}.child-card th,.child-card td{padding:9px 4px}@media(max-width:360px){.own-result{padding:14px 10px}.child-card{padding:10px 7px}table{font-size:12px}th,td{padding:9px 4px}}
</style>
<style scoped>.own-avatar img{width:29px;height:29px;filter:invert(38%) sepia(35%) saturate(1091%) hue-rotate(225deg) brightness(89%) contrast(88%)}</style>
