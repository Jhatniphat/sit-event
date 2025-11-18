<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useRegistrationStore } from '../store/RegistrationStore'
import { onMounted, ref } from 'vue'
import Modal from '@/components/ui/commons/ModalBox.vue'
import { useEventStore } from '@/features/event_management/store/EventStore'
import BaseButton from '@/components/ui/button/BaseButton.vue'

const registerStore = useRegistrationStore()
const eventStore = useEventStore()
const router = useRouter()
const eventId = router.currentRoute.value.params.id as string
const modalSuccess = ref(false)
const event = eventStore.currentEvent

const returnToHomePage = () => {
  router.push('/event/Listing')
}

const confirmRegister = async () => {
  await registerStore.registerForEvent(eventId)
  if (registerStore.error != null) {
    return
  } else {
    modalSuccess.value = true
  }
}

onMounted(() => {
  eventStore.fetchEventById(eventId)
})
</script>

<template>
  <div>
    <div class="flex flex-col justify-between h-screen">
      <div class="flex flex-row justify-between p-4 mb-4 items-center">
        <div>
          <img
            @click="returnToHomePage"
            src="../../../assets/icons/back_arrow.svg"
            alt="backToHome"
          />
        </div>
        <div class="font-semibold text-xl">{{ event?.name }}</div>
        <div class="w-5"></div>
      </div>
      <div class="flex flex-col justify-between h-full mx-5">
        <div>
          <div class="text-xl font-semibold">Select Sub-sessions</div>
          <div class="h-3"></div>
          <div class="text-lg font-bold mb-2">09:00 AM - 10:00 AM (Choose one)</div>
          <div class="flex flex-row items-center mb-4">
            <input type="checkbox" name="Cybersecurity" />
            <label class="ml-3" for="">Cybersecurity</label>
          </div>
        </div>
      </div>
      <div>
        <div class="m-4">
          <button
            @click="confirmRegister"
            class="w-full bg-blue-500 hover:bg-blue-600 rounded-sm p-3 text-white"
          >
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
    <div>
      <Modal v-model="modalSuccess">
        <div class="flex flex-row justify-center">
          <img
            src="../../../assets/icons/success_icon.svg"
            alt="Suscess Icon"
            class="w-24 h-24 my-4"
          />
        </div>
        <div class="flex flex-row justify-center text-center">
          <h2 class="text-lg font-bold my-4">Register to "{{ event?.name }}" Suscessfull!!</h2>
        </div>

        <div class="flex justify-center my-4">
          <BaseButton @click="returnToHomePage" color="blue" label="Close" />
        </div>
      </Modal>
    </div>
  </div>
</template>

<style scoped>
.container {
  /* styles */
}
</style>
