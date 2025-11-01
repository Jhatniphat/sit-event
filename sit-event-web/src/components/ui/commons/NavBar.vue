<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const backToHome = () => {
  router.push(`/`)
}

const props = defineProps({
  HeadText: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div>
    <div class="p-4 mb-4">
      <div class="flex flex-row justify-between">
        <div class="text-xl font-bold">
          <button @click="backToHome">{{ props.HeadText }}</button>
        </div>
        <slot></slot>
      </div>
    </div>
    <div class="bg-slate-100 h-0.5"></div>
  </div>
</template>

<style scoped>
.container {
  /* styles */
}
</style>
