<template>
  <div class="ai-analysis-body ai-analysis-sections">
    <small v-if="demo" class="ai-demo-notice">演示分析</small>
    <p v-for="section in sections" :key="section.key" class="ai-section"><strong class="ai-section-label" :class="`ai-label-${section.key}`">{{ section.label }}：</strong> {{ content[section.key] }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { parseAiAnalysisSections } from '../utils/aiAnalysisFormat.js'

const props = defineProps({ answer: { type: String, default: '' }, demo: Boolean })
const content = computed(() => parseAiAnalysisSections(props.answer))
const sections = [{ key: 'overall', label: '总体情况' }, { key: 'advantage', label: '优势' }, { key: 'weakness', label: '短板' }]
</script>

<style scoped>
.ai-section { margin: 0 0 12px; color: #344457; font-size: 14px; line-height: 1.9; white-space: pre-wrap; overflow-wrap: anywhere; }
.ai-section:last-child { margin-bottom: 0; }
.ai-section-label { font-weight: 700; }
.ai-label-overall { color: #111111; }
.ai-label-advantage { color: #099d87; }
.ai-label-weakness { color: #c87228; }
.ai-demo-notice { display: block; margin-bottom: 10px; color: #7188a0; font-size: 11px; }
</style>
