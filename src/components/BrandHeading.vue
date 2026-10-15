<template>
  <div class="brand-lockup" :class="{ 'brand-lockup-compact': compact }">
    <i class="brand-accent" aria-hidden="true"></i><h1 aria-label="网格生产管理">网格<span class="brand-production">生产</span>管理</h1>
  </div>
</template>
<script setup>
defineProps({ compact: Boolean })
</script>
