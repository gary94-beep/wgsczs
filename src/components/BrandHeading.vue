<template>
  <div class="brand-lockup" :class="{ 'brand-lockup-compact': compact }">
    <h1 aria-label="网格生产AI助手">
      <span class="brand-title-accessible">网格生产AI助手</span>
      <span class="brand-artwork" aria-hidden="true"><img :src="brandImage" alt="" width="2162" height="727" /></span>
    </h1>
  </div>
</template>
<script setup>
defineProps({ compact: Boolean })
const brandImage = `${import.meta.env.BASE_URL}brand-title-c-v2.png`
</script>

<style scoped>
.brand-title-accessible { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.brand-lockup { width: 340px; max-width: calc(100vw - 40px); padding: 0; }
.brand-lockup h1 { width: 100%; transform: none !important; -webkit-text-stroke: 0 !important; line-height: 1 !important; }
.brand-artwork { position: relative; display: block; width: 100%; aspect-ratio: 2050 / 380; overflow: hidden; }
.brand-artwork img { position: absolute; display: block; width: 105.4634%; max-width: none; height: auto; left: -3.1707%; top: -44.7368%; }
.brand-lockup-compact { width: 290px; max-width: calc(100vw - 86px); }
</style>
