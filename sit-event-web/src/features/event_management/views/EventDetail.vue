<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventStore } from '../store/EventStore'
import { useRegistrationStore } from '@/features/registration/store/RegistrationStore'
import Modal from '@/components/ui/commons/ModalBox.vue'
import BaseButton from '@/components/ui/button/BaseButton.vue'
const eventStore = useEventStore()
const regisStore = useRegistrationStore()

const route = useRoute()
const router = useRouter()
const event = computed(() => eventStore.currentEvent)
const myRegis = computed(() => regisStore.myRegistrations)
const isBooked = computed(() => {
  if (!event.value) return false
  return myRegis.value.some((reg) => reg.eventId === event.value?.id)
})

const isBookedByStaff = computed(() => {
  if (!event.value) return false
  return !!regisStore.myStaffStatus?.some((s) => s.eventId === event.value?.id)
})
const wasStaff = ref(false)
const modalUnregis = ref(false)
const modalUnregisSuccess = ref(false)

onMounted(async () => {
  const id = route.params.id
  console.log('Event Detail Mounted with ID:', id)
  // fetch ข้อมูลจาก backend
  await eventStore.fetchEventById(id as string)
  await regisStore.fetchMyRegistrations()
})

const returnToHomePage = () => {
  router.push('/event/Listing')
}

const goToBooking = () => {
  console.log('Navigating to booking page for event ID:', event.value?.id)
  router.push(`/event/${event.value?.id}/register`)
}
const goToApplyStaff = () => {
  router.push(`/event/${event.value?.id}/register/staff`)
}

const unregisMe = async () => {
  if (!event.value) return
  // เก็บค่าว่าก่อน unregister เป็น staff หรือไม่
  wasStaff.value = isBookedByStaff.value
  if (isBooked.value) {
    await regisStore.unregisterFromEvent(event.value.id)
  } else if (isBookedByStaff.value) {
    await regisStore.deleteMyStaffStatus(event.value.id)
  }
  modalUnregis.value = false
  if (regisStore.error == null) {
    modalUnregisSuccess.value = true
  }
}

const returnToDetail = () => {
  modalUnregis.value = false
}
</script>

<template>
  <div>
    <div class="flex flex-col justify-between h-screen">
      <div class="flex flex-row justify-between p-4 mb-2 items-center">
        <div>
          <img
            @click="returnToHomePage"
            src="../../../assets/icons/back_arrow.svg"
            alt="backToHome"
          />
        </div>
        <div class="text-lg font-bold">{{ event?.name }}</div>
        <div class="w-4"></div>
      </div>
      <div class="h-52 flex justify-center">
        <img class="w-full h-52" src="../../../assets/images/mock_sub_session1.png" />
      </div>
      <div class="flex flex-col justify-between h-full">
        <div class="h-full p-4">
          <div class="font-bold text-4xl mb-2">{{ event?.id }}</div>
          <div class="text-2xl font-semibold mb-2">{{ event?.name }}</div>
          <div class="mb-4">
            <div class="mb-2">{{ event?.description }}</div>
            <div class="text-slate"></div>
          </div>
        </div>
      </div>
      <div class="m-4">
        <div v-if="!isBooked && !isBookedByStaff" class="flex flex-row gap-2">
          <div class="flex-2">
            <button
              @click="goToBooking()"
              class="w-full bg-blue-500 hover:bg-blue-600 rounded-sm px-3 py-2 text-white"
            >
              Register Now
            </button>
          </div>
          <div>
            <button
              @click="goToApplyStaff()"
              class="w-full rounded-sm px-3 py-2 text-black border border-slate-300 hover:bg-slate-100"
            >
              Apply as Staff
            </button>
          </div>
        </div>
        <div v-if="isBooked || isBookedByStaff">
          <button
            @click="modalUnregis = true"
            class="w-full text-black border border-slate-300 hover:bg-slate-100 rounded-sm px-3 py-2"
          >
            {{ isBookedByStaff ? 'Unregistered as Staff' : 'Unregistered' }}
          </button>
        </div>
      </div>
      <div>
        <Modal v-model="modalUnregis">
          <div class="flex flex-row justify-center">
            <img
              src="../../../assets/icons/alert_icon.svg"
              alt="Suscess Icon"
              class="w-24 h-24 my-4"
            />
          </div>
          <div class="flex flex-row justify-center text-center">
            <div class="flex flex-col">
              <h2 class="font-bold text-xl mt-4 mb-2">Are you sure you want to proceed?</h2>
              <h2 class="text-sm text-slate-500 font-semibold mb-6">
                {{
                  isBookedByStaff
                    ? `If you unregister, you will lose your staff role for "${event?.name}".`
                    : `If you unregister, you will lose your right to participate in "${event?.name}".`
                }}
              </h2>
            </div>
          </div>

          <div class="flex gap-3 justify-center my-4">
            <BaseButton @click="returnToDetail" color="grey" label="Cancel" class="w-full" />
            <BaseButton @click="unregisMe" color="red" label="Unregister" class="w-full" />
          </div>
        </Modal>
        <Modal v-model="modalUnregisSuccess">
          <div class="flex flex-row justify-center">
            <img
              src="../../../assets/icons/success_icon.svg"
              alt="Suscess Icon"
              class="w-24 h-24 my-4"
            />
          </div>
          <div class="flex flex-row justify-center text-center">
            <div class="text-lg font-semibold my-4">
              <h2>Successfully unregistered{{ wasStaff ? ' as staff' : '' }} for</h2>
              <h2 class="font-bold">"{{ event?.name }}"</h2>
            </div>
          </div>

          <div class="flex justify-center my-4">
            <BaseButton @click="returnToHomePage" color="blue" label="Close" class="w-full" />
          </div>
        </Modal>
      </div>
    </div>
  </div>
</template>
