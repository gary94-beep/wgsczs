<template>
  <div class="dual-target" :class="{ compact }">
    <div v-if="!compact" class="target-endpoint">
      <span v-if="metric.hasChallengeTarget">挑战 <b>{{ format(metric.challengeTarget) }}</b> {{ unit }}</span>
      <span v-else-if="metric.hasTarget">基础 {{ format(metric.baseTarget) }} {{ unit }} <small>（未设挑战）</small></span>
      <span v-else>未设目标</span>
    </div>
    <div class="dual-track" role="progressbar" :aria-label="`${label}目标进度`" :aria-valuenow="metric.progressPercent ?? undefined" :aria-valuetext="accessibleProgress" aria-valuemin="0" aria-valuemax="100">
      <i class="dual-fill" :style="{ width: `${metric.progressPercent ?? 0}%` }"></i>
      <i v-if="showMarker" class="dual-base-marker" :style="{ left: `${metric.basePosition}%` }"></i>
      <i v-if="metric.hasChallengeTarget && metric.challengeTarget > 0 && !compact" class="dual-end-marker"></i>
    </div>
    <div v-if="!compact" class="target-marker-label">
      <span v-if="showMarker" :style="{ left: `${metric.basePosition}%`, transform: `translateX(-${metric.basePosition}%)` }">基础 {{ format(metric.baseTarget) }} {{ unit }}</span>
    </div>
    <div class="target-rates">
      <div><span>{{ compact ? '基础' : '基础完成率' }}</span><b>{{ rate('base') }}</b></div>
      <div><span>{{ compact ? '挑战' : '挑战完成率' }}</span><b>{{ rate('challenge') }}</b></div>
    </div>
    <div v-if="!compact" class="target-gaps">
      <span :class="{ achieved: reached('base') }">{{ gap('base') }}</span>
      <span :class="{ achieved: reached('challenge') }">{{ gap('challenge') }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { targetProgress } from '../utils/targetValues.js'
const props = defineProps({ item: { type: Object, required: true }, label: { type: String, default: '' }, unit: { type: String, default: '' }, compact: Boolean })
const metric = computed(() => targetProgress(props.item.production, props.item.baseTarget ?? props.item.target ?? null, props.item.challengeTarget ?? null))
const showMarker = computed(() => metric.value.hasChallengeTarget && metric.value.basePosition !== null)
const format = value => Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
function rate(kind) {
  const target = kind === 'base' ? metric.value.baseTarget : metric.value.challengeTarget
  const value = kind === 'base' ? metric.value.baseCompletionRate : metric.value.challengeCompletionRate
  return target === null ? '未设目标' : target === 0 ? '基数为0' : value === null ? '暂无数据' : `${format(value)}%`
}
function reached(kind) {
  const target = kind === 'base' ? metric.value.baseTarget : metric.value.challengeTarget
  return target !== null && metric.value.production !== null && metric.value.production >= target
}
function gap(kind) {
  const name = kind === 'base' ? '基础' : '挑战'
  const target = kind === 'base' ? metric.value.baseTarget : metric.value.challengeTarget
  if (target === null) return `未设${name}目标`
  if (metric.value.production === null) return '暂无产能数据'
  if (reached(kind)) return `${name}已达成`
  return `距${name} ${format(target - metric.value.production)} ${props.unit}`
}
const accessibleProgress = computed(() => `基础${rate('base')}，挑战${rate('challenge')}；${metric.value.hasChallengeTarget ? '按挑战目标计进度' : '按基础目标计进度'}`)
</script>

<style scoped>
.dual-target { margin-top: 10px; min-width: 0; }
.target-endpoint { display: flex; justify-content: flex-end; min-height: 24px; margin-bottom: 8px; color: #607998; font-size: 13px; line-height: 1.5; }
.target-endpoint b { color: #099d87; font-size: 16px; }
.target-endpoint small { font-size: 11px; }
.dual-track { position: relative; height: 9px; border-radius: 5px; background: #e6eef8; }
.dual-fill { display: block; height: 100%; max-width: 100%; border-radius: inherit; background: #2874ed; }
.dual-base-marker { position: absolute; z-index: 1; width: 2px; height: 22px; top: -5px; background: #142349; transform: translateX(-50%); }
.dual-end-marker { position: absolute; width: 3px; height: 17px; top: -5px; right: 0; background: #099d87; }
.target-marker-label { position: relative; height: 29px; margin-top: 8px; }
.target-marker-label span { position: absolute; white-space: nowrap; color: #142349; font-size: 12px; max-width: 100%; }
.target-rates, .target-gaps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid #e2edf7; padding: 10px 0; gap: 0; }
.target-rates > div, .target-gaps > span { min-width: 0; padding: 0 10px 0 0; }
.target-rates > div + div, .target-gaps > span + span { border-left: 1px solid #e2edf7; padding: 0 0 0 14px; }
.target-rates span { display: block; margin-bottom: 4px; color: #607998; font-size: 13px; }
.target-rates b { font-size: 22px; color: #142349; overflow-wrap: anywhere; }
.target-rates > div + div b { color: #099d87; }
.target-gaps { border-bottom: 1px solid #e2edf7; color: #607998; font-size: 13px; line-height: 1.6; }
.target-gaps .achieved { color: #099d87; font-weight: 700; }
.compact { display: flex; flex-direction: column; gap: 7px; margin-top: 0; }
.compact .dual-track { order: 2; height: 5px; }
.compact .dual-base-marker { height: 11px; top: -3px; }
.compact .target-rates { display: grid; grid-template-columns: 1fr; gap: 3px; padding: 0; border: 0; }
.compact .target-rates > div { display: flex; align-items: baseline; justify-content: space-between; gap: 3px; padding: 0; border: 0; }
.compact .target-rates span { font-size: 10px; margin: 0; }
.compact .target-rates b { font-size: 12px; }
@media (max-width: 360px) { .target-gaps { font-size: 11px; } .target-rates b { font-size: 20px; } .target-marker-label span { font-size: 11px; } }
</style>
