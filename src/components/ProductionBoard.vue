<template>
  <section class="production-board" :class="{ 'capacity-only': !showTargets }" aria-label="产能总看板">
    <header><div><h2>产能总看板</h2><p>{{ scope }} · {{ statDate }}<span v-if="demo"> · 演示数据</span></p></div><div class="board-period" role="group" aria-label="看板统计周期"><button v-for="option in periods" :key="option.id" type="button" :aria-pressed="period === option.id" :class="{ active: period === option.id }" @click="$emit('update:period', option.id)">{{ option.label }}</button></div></header>
    <div class="board-columns"><span>产品</span><span>{{ period === 'day' ? '当日产能' : '本月累计' }}</span><span v-if="showTargets">完成进度</span></div>
    <button v-for="(item, index) in items" :key="item.productId" type="button" class="board-row" :style="{ '--board-color': index % 2 ? '#099d87' : '#2874ed' }" @click="$emit('open', item.productId)">
      <strong>{{ item.productName }}</strong><span class="board-value">{{ format(value(item).production) }}<small>{{ item.unit }}</small></span><span v-if="showTargets" class="board-completion"><b>{{ rate(value(item)) }}</b><span class="board-track" role="progressbar" :aria-label="`${item.productName}看板完成进度`" :aria-valuenow="progress(value(item))" aria-valuemin="0" aria-valuemax="100" :aria-valuetext="rate(value(item))"><i :style="{ width: `${progress(value(item)) || 0}%` }"></i></span></span>
    </button>
  </section>
</template>
<script setup>
const props = defineProps({ items: { type: Array, default: () => [] }, scope: String, statDate: String, demo: Boolean, showTargets: { type: Boolean, default: true }, period: { type: String, default: 'month' } })
defineEmits(['open', 'update:period'])
const periods = [{ id: 'day', label: '日' }, { id: 'month', label: '月' }]
const value = item => props.period === 'day' ? item.daily : item
const format = n => n === null || n === undefined ? '—' : Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const rate = item => !props.showTargets || item.completionRate == null ? '暂无进度' : `${item.completionRate}%`
const progress = item => !props.showTargets || item.completionRate == null ? undefined : Math.min(100, Math.max(0, item.completionRate))
</script>
<style scoped>
.production-board { padding: 20px; background: #f6fcff; border-bottom: 1px solid #dceafa; color: #163457; }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; } h2 { margin: 0; font-size: 20px; } p { margin: 6px 0 0; color: #7188a0; font-size: 11px; }
.board-period { display: flex; padding: 3px; background: #e7f0f9; border-radius: 6px; } .board-period button { width: 36px; height: 30px; border: 0; border-radius: 4px; background: transparent; color: #607b96; font: inherit; cursor: pointer; } .board-period .active { background: #fff; color: #246de0; box-shadow: 0 1px 4px #153c6512; }
.board-columns, .board-row { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr); gap: 10px; align-items: center; }
.capacity-only .board-columns, .capacity-only .board-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.board-columns { padding: 0 0 8px; font-size: 11px; color: #7b8fa5; } .board-columns span:nth-child(2) { text-align: right; } .board-columns span:last-child { text-align: right; }
.board-row { width: 100%; padding: 15px 0; border: 0; border-top: 1px solid #e0edf6; background: transparent; text-align: left; font: inherit; cursor: pointer; } .board-row:hover { background: #eaf5ff; } .board-row:focus-visible { outline: 2px solid #2874ed; outline-offset: 2px; }
.board-row strong { color: #243d5a; font-size: 14px; overflow-wrap: anywhere; } .board-value { color: var(--board-color); font-size: 20px; font-weight: 700; text-align: right; overflow-wrap: anywhere; } small { font-size: 10px; font-weight: 400; margin-left: 3px; color: #72869e; }
.board-completion { min-width: 0; display: grid; gap: 7px; text-align: right; } b { color: var(--board-color); font-size: 13px; } .board-track { height: 5px; background: #dfeaf6; border-radius: 3px; overflow: hidden; } .board-track i { display: block; height: 100%; background: var(--board-color); border-radius: inherit; }
@media (max-width: 360px) { .production-board { padding: 16px; } .board-row strong { font-size: 12px; } .board-value { font-size: 17px; } }
</style>
