<script setup lang="ts">
import { computed } from 'vue'
import type { EventRegistration } from '../services/RegistrationService'
import router from '@/router'

const props = defineProps<{
  myRegis: EventRegistration[]
}>()

const now = new Date()
const upcoming = computed(() => props.myRegis.filter((r) => new Date(r.event.eventStartDate) > now))
const ongoing = computed(() => props.myRegis.filter((r) => new Date(r.event.eventStartDate) <= now))

function formatEventDate(dateString: string | Date): string {
  const date = new Date(dateString)

  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date)

  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)

  return `${datePart} - ${timePart}`
}

function showQRCode(eventId: string) {
  router.push(`/event/${eventId}/register/qrcode`)
}

const seeEventDetail = (eventId: string) => {
  router.push(`/event/${eventId}`)
}
</script>

<template>
  <div class="mt-8">
    <div class="font-semibold text-xl">Upcoming</div>
    <div class="h-2"></div>
    <div v-for="(reg, index) in upcoming" :key="index">
      <div class="flex flex-row justify-start items-center my-3">
        <div class="flex flex-row items-center flex-1">
          <div>
            <img
              src="../../../assets/images/mock_sub_session2.png"
              alt="Event Image"
              class="w-12 h-12 rounded-sm"
            />
          </div>
          <div class="w-5"></div>
          <div class="flex flex-col justify-center">
            <div class="">{{ reg.event.name }}</div>
            <div class="text-sm text-slate-400">
              {{ formatEventDate(reg.event.eventStartDate) }}
            </div>
          </div>
        </div>
        <div>
          <button
            @click="seeEventDetail(reg.eventId)"
            class="text-sm bg-slate-100 hover:bg-slate-200 px-5 py-1 rounded-md"
          >
            View
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="mt-8">
    <div class="font-semibold text-xl">Ongoing</div>
    <div class="h-2"></div>
    <div v-for="(reg, index) in ongoing" :key="index">
      <div class="flex flex-row justify-start items-center my-3">
        <div class="flex flex-row items-center flex-1">
          <div>
            <img
              src="../../../assets/images/mock_sub_session2.png"
              alt="Event Image"
              class="w-12 h-12 rounded-sm"
            />
          </div>
          <div class="w-5"></div>
          <div class="flex flex-col justify-center">
            <div class="">{{ reg.event.name }}</div>
            <div class="text-sm text-slate-400">
              {{ formatEventDate(reg.event.eventStartDate) }}
            </div>
          </div>
        </div>
        <div>
          <button
            @click="showQRCode(reg.eventId)"
            class="text-sm bg-slate-100 hover:bg-slate-200 px-5 py-1 rounded-md"
          >
            show QR Code
          </button>
          <button
            @click="seeEventDetail(reg.eventId)"
            class="text-sm bg-slate-100 hover:bg-slate-200 px-5 py-1 rounded-md"
          >
            View
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  /* styles */
}
</style>
