<script setup lang="ts">
import BaseButton from '@/components/ui/button/BaseButton.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const ChangeEventView = (page: string) => {
  console.log('Change Event View to:', page)
  if (page == 'back') {
    console.log('Back to Event List')
    router.push(`/`)
  } else {
    router.push(`/event/${page}`)
  }
}

// const openDeleteModal = () => {
//   console.log('Open Delete Modal')

// }
</script>

<template>
  <div>
    <div class="px-2">
      <div class="flex flex-row py-2">
        <div class="container"></div>
        <div class="container align-middle">
          <div class="container flex flex-row justify-between">
            <div class="mx-2"><BaseButton @click="ChangeEventView('create')" label="Create" /></div>
            <div class="mx-2"><BaseButton @click="ChangeEventView('view')" label="Detail" /></div>
            <div class="mx-2"><BaseButton @click="ChangeEventView('update')" label="Update" /></div>
            <div class="mx-2"><BaseButton @click="ChangeEventView('delete')" label="Delete" /></div>
          </div>
        </div>
        <div class="container"></div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
