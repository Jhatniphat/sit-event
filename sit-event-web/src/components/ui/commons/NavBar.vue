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
    <div class="p-4">
      <div class="flex flex-row justify-between">
        <div class="flex flex-row">
          <div class="text-xl font-bold items-center flex">
            <button @click="backToHome">{{ props.HeadText }}</button>
          </div>
          <div class="w-4"></div>
          <slot name="left"></slot>
        </div>
        <slot name="right"></slot>
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
