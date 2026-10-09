<template>
  <div class="capacity-trend two-point-trend">
    <svg class="trend-svg" viewBox="0 0 320 118" role="img" :aria-label="label + '：' + points.map(point => point.label + ' ' + format(point.value) + ' ' + unit).join('，')">
      <line v-for="level in [0, 0.5, 1]" :key="level" x1="38" :y1="y(maximum * level)" x2="282" :y2="y(maximum * level)" class="trend-grid" />
      <path v-if="complete" :d="'M50,' + y(points[0].value) + ' L270,' + y(points[1].value)" class="trend-current" />
      <g v-for="(point, index) in points" :key="point.label">
        <circle v-if="valid(point.value)" :cx="index === 0 ? 50 : 270" :cy="y(point.value)" r="4" class="trend-point"><title>{{ point.label }}：{{ format(point.value) }} {{ unit }}</title></circle>
        <text class="trend-point-value" :x="index === 0 ? 50 : 270" :y="valid(point.value) ? y(point.value) - 12 : 53" text-anchor="middle">{{ format(point.value) }}</text>
        <text :x="index === 0 ? 50 : 270" y="106" text-anchor="middle">{{ point.label }}</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ points: { type: Array, required: true }, unit: String, label: String })
const valid = value => typeof value === 'number' && Number.isFinite(value)
const complete = computed(() => props.points.length === 2 && props.points.every(point => valid(point.value)))
const maximum = computed(() => Math.max(1, ...props.points.map(point => valid(point.value) ? point.value : 0)))
const y = value => 82 - value / maximum.value * 52
function format(value) { return valid(value) ? Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '—' }
</script>
