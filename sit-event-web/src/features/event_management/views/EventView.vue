<script setup lang="ts">
import BaseButton from '@/components/ui/button/BaseButton.vue'
import Modal from '@/components/ui/commons/ModalBox.vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const modalOpen = ref(false)

const ChangeEventView = (page: string) => {
  router.push(`/event/${page}`)
}
const modalDeleteOpen = () => {
  modalOpen.value = true
}
</script>

<template>
  <div>
    <div class="px-2">
      <div class="flex flex-row py-2">
        <div class="container"></div>
        <div class="container align-middle">
          <div class="container flex flex-row justify-between">
            <div class="mx-2"><BaseButton @click="ChangeEventView('create')" label="Create" /></div>
            <div class="mx-2">
              <BaseButton @click="ChangeEventView('view')" label="Detail" color="grey" />
            </div>
            <div class="mx-2">
              <BaseButton @click="ChangeEventView('update')" label="Update" color="grey" />
            </div>
            <div class="mx-2">
              <BaseButton @click="modalDeleteOpen" label="Delete" color="red" />
              <Modal v-model="modalOpen">
                <h2 class="text-xl font-bold mb-4">Delete Modal</h2>
                <p>Test Modal</p>
                <div class="flex justify-end">
                  <BaseButton @click="modalOpen = false" color="red" label="Close" />
                </div>
              </Modal>
            </div>
          </div>
        </div>
        <div class="container"></div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
