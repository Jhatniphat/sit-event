<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/button/BaseButton.vue'

const router = useRouter()

const backToHome = () => {
  router.push(`/`)
}
</script>

<template>
  <div>
    <div class="p-2">
      <div class="flex flex-row justify-between pb-3">
        <div class="text-xl font-bold">EventView</div>
        <BaseButton class="m-5" @click="backToHome" label="Back" />
      </div>
      <hr />
    </div>
  </div>
</template>

<style scoped>
.container {
  /* styles */
}
</style>
