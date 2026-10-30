<template>
  <article class="capacity-card">
    <button v-if="clickable" class="capacity-card-heading" type="button" @click="$emit('open')"><span class="capacity-product-icon" :style="iconStyle" aria-hidden="true"></span><strong>{{ title }}</strong><i class="product-chevron" aria-hidden="true"></i></button>
    <div v-else class="capacity-card-heading"><span class="capacity-product-icon" :style="iconStyle" aria-hidden="true"></span><strong>{{ title }}</strong><span class="capacity-summary-tag">汇总</span></div>
    <section v-for="period in ['day', 'month']" :key="period" class="capacity-period" :class="`capacity-${period}`" :aria-label="`${title}${period === 'day' ? '日产能' : '月产能'}`">
      <div class="capacity-period-top">
        <div class="capacity-period-heading"><h3><i></i>{{ period === 'day' ? '日产能' : '月产能' }}</h3><span>{{ period === 'day' ? statDate : `${statDate.slice(5, 7)}月累计` }}</span></div>
        <strong class="capacity-actual">{{ format(metricFor(period).production) }}<small>{{ unit }}</small></strong>
      </div>
      <p v-if="metricFor(period).dataCoverage?.partial" class="capacity-coverage">已统计 {{ metricFor(period).dataCoverage.coveredGridCount }}/{{ metricFor(period).dataCoverage.selectedGridCount }} 个网格，其余网格无该类型记录</p>
      <TargetProgress v-if="showTargets" :item="metricFor(period)" :unit="unit" :target-digits="period === 'day' ? (productId === 'plan119' ? 1 : 0) : 2" :label="`${title}${period === 'day' ? '日' : '月'}产能`" />
      <div class="capacity-comparison" v-if="period === 'day'"><span>{{ weekLabel }}<b>{{ format(item.weeklyAverage) }} <small>{{ unit }}/日</small></b></span><span>{{ statDate.slice(5).replace('-', '/') }}产能<b>{{ format(item.daily.production) }} <small>{{ unit }}</small></b></span><em :class="{ 'trend-down': dailyChange?.difference < 0 }">{{ comparisonLabel(dailyChange, weekLabel) }}</em></div>
      <div class="capacity-comparison" v-else><span>上月同期日均<b>{{ format(item.previousAverage) }} <small>{{ unit }}/日</small></b></span><span>本月日均<b>{{ format(item.monthAverage) }} <small>{{ unit }}/日</small></b></span><em :class="{ 'trend-down': monthlyChange?.difference < 0 }">{{ comparisonLabel(monthlyChange, '上月同期日均') }}</em></div>
      <!-- <CapacityTrend :points="period === 'day' ? [{ label: weekLabel, value: item.weeklyAverage }, { label: statDate, value: item.daily.production }] : [{ label: '上月同期日均', value: item.previousAverage }, { label: '本月日均', value: item.monthAverage }]" :unit="`${unit}/日`" :label="`${title}${period === 'day' ? '日' : '月同期'}产能对比`" /> -->
    </section>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import contactIcon from '../assets/product-icons/contact.svg'
import giftIcon from '../assets/product-icons/gift.svg'
import smartphoneIcon from '../assets/product-icons/smartphone.svg'
import houseIcon from '../assets/product-icons/house.svg'
import wifiIcon from '../assets/product-icons/wifi.svg'
import buildingIcon from '../assets/product-icons/building-2.svg'
// import CapacityTrend from './CapacityTrend.vue'
import { compareCapacity } from '../utils/capacityMetrics.js'
import TargetProgress from './TargetProgress.vue'
const props = defineProps({ title: String, item: Object, unit: String, productId: String, statDate: { type: String, default: '' }, icon: { type: String, default: 'building-2' }, clickable: { type: Boolean, default: true }, showTargets: { type: Boolean, default: true } })
defineEmits(['open'])
const iconUrl = computed(() => ({ contact: contactIcon, gift: giftIcon, smartphone: smartphoneIcon, house: houseIcon, wifi: wifiIcon })[props.icon] || buildingIcon)
const iconStyle = computed(() => ({ '--capacity-icon': `url(${JSON.stringify(iconUrl.value)})` }))
const metricFor = period => period === 'day' ? props.item.daily : props.item
const weekLabel = computed(() => props.item.weekBasis === 'rolling7' ? '近7天日均' : '本周日均')
const dailyChange = computed(() => compareCapacity(props.item.daily.production, props.item.weeklyAverage))
const monthlyChange = computed(() => compareCapacity(props.item.monthAverage, props.item.previousAverage))
function comparisonLabel(change, baseline) {
  if (!change) return `较${baseline}：暂无可比数据`
  const signed = value => `${value > 0 ? '+' : value < 0 ? '-' : ''}${format(Math.abs(value))}`
  const percent = change.percent === null ? '基期为0，增幅不适用' : `${signed(change.percent)}%`
  return `较${baseline} ${signed(change.difference)} ${props.unit}/日（${percent}）`
}
function format(value) { return value === null || value === undefined ? '—' : Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) }
</script>

<style scoped>
.capacity-period-top { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 10px; align-items: start; }
.capacity-coverage { margin: 8px 0 0; color: #7188a0; font-size: 11px; line-height: 1.6; }
.capacity-period-top .capacity-period-heading { display: grid; gap: 6px; }
.capacity-period-top .capacity-period-heading h3 { font-size: 17px; }
.capacity-period-top .capacity-period-heading > span { font-size: 12px; }
.capacity-actual { min-width: 0; color: var(--period-color); font-size: 38px; font-weight: 800; text-align: right; line-height: 1.2; overflow-wrap: anywhere; }
.capacity-actual small { font-size: 16px; margin-left: 5px; font-weight: 500; }
.capacity-comparison { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 0; margin: 14px 0 0; }
.capacity-comparison > span { min-width: 0; padding-right: 10px; }
.capacity-comparison > span + span { border-left: 1px solid #e2edf7; padding: 0 0 0 14px; }
.capacity-comparison em { grid-column: 1 / -1; border-top: 1px solid #e2edf7; padding-top: 9px; }
@media (max-width: 360px) { .capacity-actual { font-size: 32px; } .capacity-comparison > span { font-size: 12px; } .capacity-comparison b { font-size: 16px; } }
</style>
