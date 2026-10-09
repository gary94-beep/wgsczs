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
const props = defineProps({ summary: { type: Object, required: true } })
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
    const response = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(65000), body: JSON.stringify({ summary: snapshot, question: mode.value === '自定义提问' ? question.value : '请进行短板分析优化，按以下结构简洁输出：1.重点短板，依据目标完成进度、产能变化和已提供的零产低产分布识别问题并列出具体数据依据；2.原因核实，将可能原因与已知事实分开，说明缺失的数据，不将未提供的预警数量视为0；3.优化建议，按优先级给出可执行的跟进动作和复核指标。不同产品单位不可直接相加；不编造资费政策、人员明细、目标或改善成效。' }) })
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('AI后端未启用，请启动本地开发服务或配置正式后端')
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || '分析失败，请重试')
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
