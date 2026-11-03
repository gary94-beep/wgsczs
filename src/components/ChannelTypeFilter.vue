<template>
  <label class="channel-type-filter">
    <span>生产类型</span>
    <select :value="modelValue" aria-label="生产类型" @change="$emit('update:modelValue', $event.target.value)">
      <option value="">全部类型</option>
      <option v-for="type in channelTypes" :key="type" :value="type">{{ type }}</option>
    </select>
  </label>
</template>

<script setup>
import { channelTypes } from '../utils/channelTypes.js'
defineProps({ modelValue: { type: String, default: '' } })
defineEmits(['update:modelValue'])
</script>
