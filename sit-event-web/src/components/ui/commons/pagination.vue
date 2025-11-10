<template>
  <div class="flex flex-row justify-end">
    <div class="join">
      <button
        v-for="n in count"
        :key="n"
        class="join-item btn btn-md"
        :class="{ 'btn-active': active === n }"
        @click="onClick(n)"
      >
        {{ n }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue'

interface Props {
  count: number
  modelValue?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'page-change', value: number): void
}>()

const active = ref<number>(props.modelValue ?? 1)

watch(
  () => props.modelValue,
  (val) => {
    if (val !== undefined) active.value = val
  },
)

function onClick(n: number) {
  if (active.value !== n) {
    active.value = n
    emit('update:modelValue', n)
    emit('page-change', n)
  }
}
</script>
