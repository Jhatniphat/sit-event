<template>
  <div class="w-full">
    <!-- Label -->
    <label v-if="label" :for="id" class="pb-1 block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
    </label>
    <!-- Input -->
    <input
      :id="id"
      :type="type"
      v-model="localValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full rounded-sm bg-slate-100 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 disabled:bg-gray-100 disabled:cursor-not-allowed"
    />

    <!-- Error Message -->
    <p v-if="error" class="text-sm text-red-500 mt-1">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  error: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    default: () => `input-${Math.random().toString(36).substring(2, 9)}`,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const localValue = ref(props.modelValue)

watch(localValue, (val) => {
  emit('update:modelValue', val)
})

watch(
  () => props.modelValue,
  (val) => {
    if (val !== localValue.value) localValue.value = val
  },
)
</script>
