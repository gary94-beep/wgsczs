<template>
  <section class="ai-analysis-panel">
    <header><h2>AI经营分析</h2><span>MoMA · DeepSeek Flash</span></header>
    <div class="ai-modes" role="group" aria-label="分析类型"><button v-for="item in modes" :key="item" :class="{ active: mode === item }" type="button" @click="mode = item">{{ item }}</button></div>
    <textarea v-if="mode === '自定义提问'" v-model="question" aria-label="分析问题" maxlength="1000" rows="3" placeholder="请输入分析问题" />
    <label class="ai-consent"><input v-model="consent" type="checkbox" />同意将当前筛选的汇总指标发送至移动云 MoMA 分析</label>
    <button class="ai-run" type="button" :disabled="busy || !consent || (mode === '自定义提问' && !question.trim())" @click="run">{{ busy ? '分析中…' : '开始分析' }}</button>
    <p v-if="error" role="alert" class="ai-error">{{ error }}</p>
    <div v-if="answer" class="ai-result" aria-live="polite"><strong>{{ resultLabel }} · {{ resultDemo ? '演示数据' : '经营数据' }}</strong><p>{{ answer }}</p><small>AI分析仅供参考，请核实异常原因。</small></div>
  </section>
</template>
<script setup>
import { ref, watch } from 'vue'
const props = defineProps({ summary: { type: Object, required: true }, analyze: { type: Function, required: true } })
const modes = ['短板分析优化', '自定义提问']
const mode = ref(modes[0]), question = ref(''), consent = ref(false), busy = ref(false), answer = ref(''), error = ref(''), resultLabel = ref(''), resultDemo = ref(false)
let sequence = 0
watch(() => JSON.stringify(props.summary), () => { sequence++; answer.value = ''; error.value = ''; consent.value = false })
async function run() {
  if (!consent.value || busy.value) return
  const id = ++sequence
  const snapshot = JSON.parse(JSON.stringify(props.summary))
  busy.value = true; answer.value = ''; error.value = ''
  try {
    const result = await props.analyze({ summary: snapshot, consent: true, question: mode.value === '自定义提问' ? question.value : '请简洁分析经营短板、待核实原因和优先跟进建议，列出数据依据。' })
    if (typeof result?.answer !== 'string' || !result.answer.trim()) throw new Error('AI未返回有效分析结果')
    if (id === sequence) { answer.value = result.answer; resultLabel.value = `${snapshot.scope} · ${snapshot.product} · ${snapshot.statDate}`; resultDemo.value = snapshot.demo }
  } catch (e) { if (id === sequence) error.value = e.name === 'TimeoutError' ? '分析超时，请重试' : e.message }
  finally { busy.value = false }
}
</script>
<style scoped>
.ai-analysis-panel { margin: 16px 20px; padding: 18px; border: 1px solid #cee1ff; border-radius: 8px; background: #fff; color: #163457; }
header { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; } h2 { font-size: 18px; margin: 0; } header span, small { font-size: 12px; color: #527091; }
.ai-modes { display: flex; gap: 6px; margin: 16px 0; flex-wrap: wrap; } button { font: inherit; cursor: pointer; } .ai-modes button { border: 1px solid #d4e4fa; background: #f5faff; padding: 8px 10px; border-radius: 6px; font-size: 13px; color: #37628f; } .ai-modes .active { background: #e5f0ff; border-color: #2974f4; color: #2268d6; }
textarea { display: block; box-sizing: border-box; width: 100%; margin: 8px 0; padding: 10px; border: 1px solid #bdd4f5; border-radius: 6px; resize: vertical; font: inherit; }
.ai-consent { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; line-height: 1.7; margin: 12px 0; } input { flex-shrink: 0; margin-top: 4px; accent-color: #2674ef; }
.ai-run { background: #2875ef; color: white; border: 0; border-radius: 6px; padding: 10px 18px; } .ai-run:disabled { opacity: .5; cursor: default; } .ai-error { color: #ba3546; font-size: 13px; } .ai-result { margin-top: 16px; border-top: 1px solid #e2ecfa; padding-top: 14px; overflow-wrap: anywhere; } .ai-result strong { font-size: 13px; } .ai-result p { white-space: pre-wrap; font-size: 14px; line-height: 1.8; }
</style>
