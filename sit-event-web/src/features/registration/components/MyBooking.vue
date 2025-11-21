<script setup lang="ts">
import { computed } from 'vue'
import type { EventRegistration } from '../services/RegistrationService'
import router from '@/router'

const props = defineProps<{
  myRegis: EventRegistration[]
}>()

const now = new Date()
const upcoming = computed(() => props.myRegis.filter((r) => new Date(r.event.eventStartDate) > now))

const ongoing = computed(() =>
  props.myRegis.filter(
    (r) => new Date(r.event.eventStartDate) <= now && new Date(r.event.eventEndDate) >= now,
  ),
)

const past = computed(() => props.myRegis.filter((r) => new Date(r.event.eventEndDate) < now))

function formatEventRange(start: string | Date, end: string | Date): string {
  const s = new Date(start)
  const e = new Date(end)

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }

  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate()

  if (sameDay) {
    // Example: Jan 5, 2025 — 09:00 AM - 04:00 PM
    return (
      new Intl.DateTimeFormat('en-US', dateOptions).format(s) +
      ` — ` +
      `${new Intl.DateTimeFormat('en-US', timeOptions).format(s)} - ${new Intl.DateTimeFormat(
        'en-US',
        timeOptions,
      ).format(e)}`
    )
  } else {
    // Example: Jan 5–7, 2025
    return (
      new Intl.DateTimeFormat('en-US', dateOptions).format(s) +
      ' — ' +
      new Intl.DateTimeFormat('en-US', dateOptions).format(e)
    )
  }
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
        <div @click="seeEventDetail(reg.eventId)" class="flex flex-row items-center flex-1">
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
              {{ formatEventRange(reg.event.eventStartDate, reg.event.eventEndDate) }}
            </div>
          </div>
        </div>
        <!-- <div>
          <button
            @click="seeEventDetail(reg.eventId)"
            class="text-sm bg-slate-100 hover:bg-slate-200 px-5 py-1 rounded-md"
          >
            View
          </button>
        </div> -->
      </div>
    </div>
  </div>
  <div class="mt-8">
    <div class="font-semibold text-xl">Ongoing</div>
    <div class="h-2"></div>
    <div v-for="(reg, index) in ongoing" :key="index">
      <div class="flex flex-row justify-start items-center my-3">
        <div @click="seeEventDetail(reg.eventId)" class="flex flex-row items-center flex-1">
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
              {{ formatEventRange(reg.event.eventStartDate, reg.event.eventEndDate) }}
            </div>
          </div>
        </div>
        <div>
          <button
            @click="showQRCode(reg.eventId)"
            class="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-md"
          >
            show QR Code
          </button>
          <!-- <button
            @click="seeEventDetail(reg.eventId)"
            class="text-sm bg-slate-100 hover:bg-slate-200 px-5 py-1 rounded-md"
          >
            View
          </button> -->
        </div>
      </div>
    </div>
  </div>
  <div v-if="past.length != 0" class="mt-8">
    <div class="font-semibold text-xl">Past</div>
    <div class="h-2"></div>
    <div v-for="(reg, index) in past" :key="index">
      <div class="flex flex-row justify-start items-center my-3 opacity-70">
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
            <div>{{ reg.event.name }}</div>
            <div class="text-sm text-slate-400">
              {{ formatEventRange(reg.event.eventStartDate, reg.event.eventEndDate) }}
            </div>
          </div>
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
