<template>
  <section class="operating-analysis" aria-label="经营分析">
    <header><h2>经营分析</h2><span>{{ period === 'day' ? '当日' : '本月' }} · {{ demo ? '演示数据' : statDate }}</span></header>
    <p class="analysis-summary">{{ analysis.summary }}</p>
    <p v-if="analysis.advantage"><strong class="analysis-advantage">优势</strong>{{ analysis.advantage }}</p>
    <p v-if="analysis.weakness"><strong class="analysis-weakness">短板</strong>{{ analysis.weakness }}</p>
    <p v-if="analysis.action"><strong>跟进重点</strong>{{ analysis.action }}</p>
  </section>
</template>
<script setup>
import { computed } from 'vue'
import { buildOperatingAnalysis } from '../utils/operatingAnalysis.js'
const props = defineProps({ items: { type: Array, default: () => [] }, statDate: String, period: String, demo: Boolean, showTargets: Boolean })
const analysis = computed(() => buildOperatingAnalysis(props.items, props))
</script>
