<template>
  <div class="brand-lockup" :class="{ 'brand-lockup-compact': compact }">
    <i class="brand-accent" aria-hidden="true"></i><h1 aria-label="网格生产AI助手">网格生产<span class="brand-ai">AI</span>助手</h1>
  </div>
</template>
<script setup>
defineProps({ compact: Boolean })
</script>
