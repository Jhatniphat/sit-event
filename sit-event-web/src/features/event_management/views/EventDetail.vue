<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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

function formatDateTime(dateString: string | undefined) {
  if (!dateString) return ''
  const date = new Date(dateString)

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }

  const datePart = date?.toLocaleDateString('en-GB', options)

  const hours = date?.getHours()
  const minutes = date?.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12

  return `${datePart} - ${hour12}:${minutes} ${ampm}`
}

const imageObjectUrls = new Map<number, string>()

function getImageSrc(img: unknown, index: number) {
  if (!img) return ''
  if (typeof img === 'string') return img
  // treat as File/Blob
  if (imageObjectUrls.has(index)) return imageObjectUrls.get(index)!
  try {
    const url = URL.createObjectURL(img as Blob)
    imageObjectUrls.set(index, url)
    return url
  } catch {
    return ''
  }
}

onUnmounted(() => {
  imageObjectUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  })
  imageObjectUrls.clear()
})
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <!-- TOP CONTENT (scrollable) -->
    <div class="flex-1 overflow-y-auto">
      <!-- Header -->
      <div class="flex flex-row justify-between p-4 mb-2 items-center">
        <img
          @click="returnToHomePage"
          src="../../../assets/icons/back_arrow.svg"
          alt="backToHome"
        />
        <div class="text-lg font-bold">Event Details</div>
        <div class="w-4"></div>
      </div>
      <!-- Event Images -->
      <div v-for="(imgUrl, index) in event?.images" :key="index" class="w-full bg-slate-500">
        <img :src="getImageSrc(imgUrl, index)" class="w-full object-contain" />
      </div>

      <!-- Details -->
      <div class="p-4">
        <div class="font-bold text-2xl my-2">{{ event?.name }}</div>
        <div class="mt-3 mb-5 whitespace-pre-line">
          {{ event?.description }}
        </div>
        <div class="h-4"></div>
        <div class="mb-3 font-semibold">Event Details</div>
        <div class="flex flex-row gap-2 justify-between w-full">
          <div class="w-full">
            <hr />
            <div class="flex flex-row mt-3 w-full items-center gap-2">
              <div>
                <img
                  src="../../../assets/icons/time_calendar_icon.svg"
                  alt="timeCalendar"
                  class="w-4 h-4"
                />
              </div>
              <div>Date & Time</div>
            </div>
            <div class="h-4"></div>
            <div class="flex flex-row gap-2">
              <div class="flex flex-col">
                <div class="text-slate-500 text-sm">Open Register :</div>
                <div class="font-semibold">
                  {{ formatDateTime(event?.registrationOpenDate) }}
                </div>
              </div>
              <div class="flex flex-col">
                <div class="text-slate-500 text-sm">Close Register :</div>
                <div class="font-semibold">
                  {{ formatDateTime(event?.registrationEndDate) }}
                </div>
              </div>
            </div>
            <div class="h-5"></div>
            <div class="flex flex-row gap-2">
              <div class="flex flex-col">
                <div class="text-sm text-slate-500">Event Start :</div>
                <div class="font-semibold">
                  {{ formatDateTime(event?.registrationOpenDate) }}
                </div>
              </div>
              <div class="flex flex-col">
                <div class="text-sm text-slate-500">Event End :</div>
                <div class="font-semibold">{{ formatDateTime(event?.registrationEndDate) }}</div>
              </div>
            </div>
            <div class="h-4"></div>
            <hr />
            <div class="flex flex-row mt-3 w-full items-center gap-1">
              <div>
                <img
                  src="../../../assets/icons/location_icon.svg"
                  alt="timeCalendar"
                  class="w-6 h-6"
                />
              </div>
              <div>Location</div>
            </div>
            <div class="h-3"></div>
            <div class="font-semibold">LX12-4</div>
            <div class="h-4"></div>
            <hr />
            <div class="flex flex-row mt-3 w-full items-center gap-1">
              <div>
                <img src="../../../assets/icons/tags_icon.svg" alt="timeCalendar" class="w-6 h-6" />
              </div>
              <div>Tags</div>
            </div>
            <div class="h-3"></div>
            <div v-for="(tag, index) in event?.tags" :key="index">
              <div class="bg-slate-100 rounded-4xl px-3 py-1 inline-block text-sm mb-2 mr-2">
                {{ tag }}
              </div>
            </div>
            <div class="h-4"></div>
            <hr />
          </div>
        </div>
      </div>
    </div>

    <!-- FIXED BOTTOM BUTTON -->
    <div
      class="py-4 px-3 h-20 justify-center bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.08)] rounded-t-lg"
    >
      <div v-if="!isBooked && !isBookedByStaff" class="flex flex-row gap-2">
        <div class="flex-6">
          <button
            @click="goToBooking"
            class="w-full bg-blue-500 hover:bg-blue-600 rounded-sm px-3 py-2 text-white"
          >
            Register Now
          </button>
        </div>
        <div class="flex-4">
          <button
            @click="goToApplyStaff"
            class="w-full rounded-sm px-3 py-2 text-black border border-slate-300 hover:bg-slate-100"
          >
            Apply as Staff
          </button>
        </div>
      </div>

      <div v-else>
        <button
          @click="modalUnregis = true"
          class="w-full text-black border border-slate-300 hover:bg-slate-100 rounded-sm px-3 py-2"
        >
          {{ isBookedByStaff ? 'Unregistered as Staff' : 'Unregistered' }}
        </button>
      </div>
    </div>

    <!-- UNREGISTER MODALS -->
    <Modal v-model="modalUnregis">
      <div class="flex flex-row justify-center">
        <img src="../../../assets/icons/alert_icon.svg" alt="Suscess Icon" class="w-24 h-24 my-4" />
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
</template>
