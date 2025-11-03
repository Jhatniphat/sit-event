<template>
  <div class="w-full">
    <!-- Label -->
    <label v-if="label" :for="id" class="pb-1 block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
    </label>

    <!-- Textarea -->
    <textarea
      :id="id"
      v-model="localValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      class="w-full rounded-sm bg-slate-100 px-3 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
    ></textarea>

    <!-- Error Message -->
    <p v-if="error" class="text-sm text-red-500 mt-1">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue'

const props = defineProps({
  modelValue: String,
  label: String,
  placeholder: String,
  rows: {
    type: Number,
    default: 3,
  },
  error: String,
  id: {
    type: String,
    default: () => `textarea-${Math.random().toString(36).slice(2, 9)}`,
  },
  disabled: Boolean,
})

const emit = defineEmits(['update:modelValue'])
const localValue = ref(props.modelValue)

watch(localValue, (val) => emit('update:modelValue', val))
watch(
  () => props.modelValue,
  (val) => {
    if (val !== localValue.value) localValue.value = val
  },
)
</script>
