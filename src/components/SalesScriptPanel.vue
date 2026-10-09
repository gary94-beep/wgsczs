<template>
  <details class="sales-script-panel" :class="{ 'script-library-panel': expanded }" :open="expanded">
    <summary><span><strong>话术推荐</strong><small>{{ productName }}</small></span><b>{{ script?.status === 'maintained' ? '已维护' : '示例' }}</b></summary>
    <div class="sales-script-body">
      <div class="sales-script-meta"><span>{{ script?.source || '暂无话术' }}</span><time v-if="script?.updatedAt">更新于 {{ new Date(script.updatedAt).toLocaleString('zh-CN', { hour12: false }) }}</time><span v-else>待维护正式内容</span></div>
      <template v-if="editing">
        <label class="sales-script-editor">{{ productName }}话术<textarea v-model="draft" rows="7" maxlength="4000" placeholder="请输入当前产品的话术内容" /></label>
        <div class="sales-script-actions"><button type="button" :disabled="busy" @click="editing = false">取消</button><button type="button" class="script-primary" :disabled="busy || !draft.trim()" @click="$emit('save', { productId, content: draft.trim() })">保存话术</button></div>
      </template>
      <template v-else>
        <p class="sales-script-content">{{ script?.content || '当前产品暂无推荐话术' }}</p>
        <div class="sales-script-actions"><button v-if="canEdit" type="button" @click="editing = true">维护话术</button><button type="button" class="script-primary" :disabled="!script?.content" @click="copyScript">复制话术</button></div>
      </template>
    </div>
  </details>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({ script: Object, productId: String, productName: String, canEdit: Boolean, busy: Boolean, expanded: Boolean })
const emit = defineEmits(['save', 'copied', 'error'])
const editing = ref(false)
const draft = ref('')
watch(() => [props.productId, props.script?.content, props.script?.updatedAt], () => { draft.value = props.script?.content || ''; editing.value = false }, { immediate: true })
async function copyScript() {
  try { await navigator.clipboard.writeText(props.script.content); emit('copied') }
  catch { emit('error', '复制失败，请选中文字复制') }
}
</script>
