<template>
  <section class="production-board" :class="{ 'capacity-only': !showTargets }" aria-label="产能总看板">
    <header><div><h2>产能总看板</h2><p><time>{{ statDate }}</time><span v-if="demo" class="board-demo">演示数据</span></p></div><div class="board-period" role="group" aria-label="看板统计周期"><button v-for="option in periods" :key="option.id" type="button" :aria-pressed="period === option.id" :class="{ active: period === option.id }" @click="$emit('update:period', option.id)">{{ option.label }}</button></div></header>
    <button v-for="item in items" :key="item.productId" type="button" class="board-row" :aria-label="`${item.productName}，${period === 'day' ? '当日产能' : '本月累计'}${format(value(item).production)}${item.unit}，查看详情`" @click="$emit('open', item.productId)">
      <span class="board-product"><span class="board-product-icon" :style="iconStyle(item.productId)" aria-hidden="true"></span><strong>{{ item.productName }}</strong></span>
      <span class="board-value">{{ format(value(item).production) }}<small>{{ item.unit }}</small></span>
      <span v-if="value(item).dataCoverage?.partial" class="coverage-note">已统计 {{ value(item).dataCoverage.coveredGridCount }}/{{ value(item).dataCoverage.selectedGridCount }} 个网格</span>
      <span v-if="showTargets" class="board-targets"><span v-for="kind in targetKinds" :key="kind.id" class="board-target-chip" :class="`board-target-${kind.id}`"><span>{{ kind.label }}</span><b :class="{ 'board-rate-status': !rate(value(item), kind.id).endsWith('%') }">{{ rate(value(item), kind.id) }}</b></span></span>
    </button>
  </section>
</template>
<script setup>
import { targetProgress } from '../utils/targetValues.js'
import contactIcon from '../assets/product-icons/contact.svg'
import giftIcon from '../assets/product-icons/gift.svg'
import smartphoneIcon from '../assets/product-icons/smartphone.svg'
import wifiIcon from '../assets/product-icons/wifi.svg'
import buildingIcon from '../assets/product-icons/building-2.svg'
const props = defineProps({ items: { type: Array, default: () => [] }, scope: String, statDate: String, demo: Boolean, showTargets: { type: Boolean, default: true }, period: { type: String, default: 'month' } })
defineEmits(['open', 'update:period'])
const periods = [{ id: 'day', label: '日' }, { id: 'month', label: '月' }]
const value = item => props.period === 'day' ? item.daily : item
const format = n => n === null || n === undefined ? '—' : Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const targetKinds = [{ id: 'min', label: '底线' }, { id: 'base', label: '基础' }, { id: 'challenge', label: '挑战' }]
const iconStyle = id => ({ '--board-icon': `url("${({ newNumbers: contactIcon, plan119: giftIcon, terminal: smartphoneIcon, homeBroadband: wifiIcon })[id] || buildingIcon}")` })
function rate(item, kind) {
  const metric = targetProgress(item.production, item.baseTarget ?? item.target ?? null, item.challengeTarget ?? null, item.minTarget ?? null)
  const target = metric[`${kind}Target`], completion = metric[`${kind}CompletionRate`]
  return target === null ? '未设目标' : target === 0 ? '基数为0' : completion === null ? '暂无数据' : `${format(completion)}%`
}
</script>
<style scoped>
.production-board { margin: 12px 14px 20px; padding: 18px 16px 8px; border: 1px solid #e1edf8; border-radius: 8px; background: #fff; color: #142349; }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
header > div:first-child { min-width: 0; } h2 { margin: 0; font-size: 22px; line-height: 1.4; } p { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 6px 0 0; color: #7188a0; font-size: 12px; }
.board-demo { padding: 2px 7px; border-radius: 4px; color: #226df0; background: #eaf3ff; }
.board-period { display: flex; flex: 0 0 auto; padding: 3px; border-radius: 6px; background: #e9f0f8; }
.board-period button { width: 42px; height: 36px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: #607b96; font: inherit; font-size: 16px; cursor: pointer; }
.board-period .active { color: #fff; background: #1672fa; }
.board-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .65fr); align-items: center; gap: 8px; width: 100%; padding: 13px 0; border: 0; border-top: 1px solid #e2edf8; background: transparent; text-align: left; font: inherit; cursor: pointer; }
.board-row:hover { background: #f5faff; } .board-row:focus-visible { outline: 2px solid #2874ed; outline-offset: 3px; }
.board-product { display: flex; align-items: center; gap: 10px; min-width: 0; }
.board-product strong { min-width: 0; font-size: 16px; line-height: 1.5; overflow-wrap: anywhere; }
.board-product-icon { display: grid; place-items: center; flex: 0 0 36px; width: 36px; height: 36px; border-radius: 7px; background: #eaf3ff; }
.board-product-icon::before { content: ''; display: block; width: 24px; height: 24px; background: #1672fa; mask: var(--board-icon) center / contain no-repeat; -webkit-mask: var(--board-icon) center / contain no-repeat; }
.board-value { min-width: 0; color: #1269ed; font-size: 28px; line-height: 1.2; font-weight: 800; text-align: right; overflow-wrap: anywhere; }
.board-value small { margin-left: 5px; color: #72869e; font-size: 12px; font-weight: 500; }
.board-targets { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.board-target-chip { display: flex; align-items: center; justify-content: space-between; gap: 4px; min-width: 0; min-height: 38px; padding: 5px 8px; border-radius: 5px; background: #eaf3ff; color: #1269ed; }
.board-target-chip > span { font-size: 11px; flex: 0 0 auto; } .board-target-chip b { min-width: 0; font-size: 17px; line-height: 1.3; overflow-wrap: anywhere; }
.board-target-chip b.board-rate-status { font-size: 12px; }
.board-target-base { color: #142349; background: #f0f3f8; } .board-target-base > span { color: #607998; }
.board-target-challenge { color: #099d87; background: #e2f8f1; }
.coverage-note { grid-column: 1 / -1; color: #7188a0; font-size: 11px; line-height: 1.5; }
@media (max-width: 360px) { .production-board { margin: 10px; padding: 16px 12px 6px; } h2 { font-size: 20px; } .board-product { gap: 7px; } .board-product strong { font-size: 14px; } .board-value { font-size: 25px; } .board-target-chip { flex-direction: column; align-items: flex-start; justify-content: center; min-height: 47px; padding: 5px 7px; gap: 2px; } .board-target-chip b { font-size: 16px; } }
</style>
