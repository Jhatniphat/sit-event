<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
})

const emit = defineEmits(['update:modelValue'])

const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const close = () => {
  show.value = false
}
</script>

<template>
  <!-- Overlay -->
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    @click.self="close"
  >
    <div class="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
      <!-- Slot for custom content -->
      <div>
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
