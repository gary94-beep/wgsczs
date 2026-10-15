<template>
  <article class="capacity-card">
    <button v-if="clickable" class="capacity-card-heading" type="button" @click="$emit('open')"><span class="capacity-product-icon" :style="iconStyle" aria-hidden="true"></span><strong>{{ title }}</strong><i class="product-chevron" aria-hidden="true"></i></button>
    <div v-else class="capacity-card-heading"><span class="capacity-product-icon" :style="iconStyle" aria-hidden="true"></span><strong>{{ title }}</strong><span class="capacity-summary-tag">汇总</span></div>
    <section v-for="period in ['day', 'month']" :key="period" class="capacity-period" :class="`capacity-${period}`" :aria-label="`${title}${period === 'day' ? '日产能' : '月产能'}`">
      <div class="capacity-period-heading"><h3><i></i>{{ period === 'day' ? '日产能' : '月产能' }}</h3><span>{{ period === 'day' ? statDate : `${statDate.slice(5, 7)}月累计` }}</span><b v-if="showTargets">{{ rate(metricFor(period)) }}</b></div>
      <div class="capacity-values"><strong>{{ format(metricFor(period).production) }}<small>{{ unit }}</small></strong><div v-if="showTargets"><span>{{ period === 'day' ? '日目标' : '月目标' }} {{ format(metricFor(period).target) }} {{ metricFor(period).hasTarget ? unit : '' }}</span><span>{{ gap(metricFor(period)) }}</span></div></div>
      <div class="capacity-progress" role="progressbar" :aria-label="`${title}${period === 'day' ? '日' : '月'}产能进度`" :aria-valuenow="metricFor(period).completionRate === null ? undefined : Math.min(100, metricFor(period).completionRate)" :aria-valuetext="metricFor(period).completionRate === null ? '暂无进度数据' : rate(metricFor(period))" aria-valuemin="0" aria-valuemax="100"><i :style="{ width: `${Math.min(100, Math.max(0, metricFor(period).completionRate || 0))}%` }"></i></div>
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
const props = defineProps({ title: String, item: Object, unit: String, statDate: { type: String, default: '' }, icon: { type: String, default: 'building-2' }, clickable: { type: Boolean, default: true }, showTargets: { type: Boolean, default: true } })
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
function rate(item) { return item.completionRate === null ? (item.hasTarget ? '—' : '未设目标') : `${item.completionRate}%` }
function gap(item) { return !item.hasTarget ? '待设置目标' : item.production === null ? '暂无产能数据' : item.gap > 0 ? `距目标还差 ${format(item.gap)} ${props.unit}` : '已达成目标' }
</script>
