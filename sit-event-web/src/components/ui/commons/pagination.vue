<template>
  <div class="flex flex-row justify-end items-center gap-2 select-none">
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
import { ref, watch, defineProps, defineEmits, onMounted, onUnmounted } from 'vue'

interface Props {
  count: number
  modelValue?: number
  responsive?: boolean // ถ้าอยากเปิดปิดฟีเจอร์ responsive limit
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'page-change', value: number): void
  (e: 'limit-change', value: number): void
}>()

const active = ref<number>(props.modelValue ?? 1)
const limit = ref<number>(10)

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

// 🧩 Responsive limit
function updateLimit() {
  if (!props.responsive) return
  const width = window.innerWidth
  if (width < 1024) limit.value = 5
  else limit.value = 8
  console.log(limit.value)
  emit('limit-change', limit.value)
}

onMounted(() => {
  updateLimit()
  if (props.responsive) {
    window.addEventListener('resize', updateLimit)
  }
})

onUnmounted(() => {
  if (props.responsive) {
    window.removeEventListener('resize', updateLimit)
  }
})
</script>
