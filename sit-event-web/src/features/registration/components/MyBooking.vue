<script setup lang="ts">
import { computed } from 'vue'
import type { EventRegistration } from '../services/RegistrationService'
import router from '@/router'

const props = defineProps<{
  myRegis: EventRegistration[]
}>()

interface GroupedReg {
  eventId: string;
  event: any;
  mainReg: EventRegistration | null;
  sessions: EventRegistration[];
}

const groupedRegis = computed(() => {
  const map = new Map<string, GroupedReg>();
  props.myRegis.forEach(r => {
    if (!map.has(r.eventId)) {
      map.set(r.eventId, { eventId: r.eventId, event: r.event, mainReg: null, sessions: [] });
    }
    const group = map.get(r.eventId)!;
    if (r.sessionId) group.sessions.push(r);
    else group.mainReg = r;
  });
  return Array.from(map.values()).filter(g => g.mainReg !== null);
});

const now = new Date()
const upcoming = computed(() => groupedRegis.value.filter((g) => new Date(g.event.eventStartDate) > now))

const ongoing = computed(() =>
  groupedRegis.value.filter(
    (g) => new Date(g.event.eventStartDate) <= now && new Date(g.event.eventEndDate) >= now,
  ),
)

const past = computed(() => groupedRegis.value.filter((g) => new Date(g.event.eventEndDate) < now))

function statusBgColor(status: string) {
  if (status === 'APPROVED') return 'text-green-700 bg-green-100 border border-green-200';
  if (status === 'PENDING' || status === 'RESERVE') return 'text-yellow-700 bg-yellow-100 border border-yellow-200';
  if (status === 'REJECTED') return 'text-red-700 bg-red-100 border border-red-200';
  return 'text-slate-700 bg-slate-100 border border-slate-200';
}

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
  router.push({ name: 'ShowQRCode', params: { id: eventId } })
}

const seeEventDetail = (eventId: string) => {
  router.push({ name: 'EventDetail', params: { id: eventId } })
}
</script>

<template>
  <div class="mt-8">
    <div class="font-semibold text-xl mb-4">Upcoming</div>
    <div v-if="upcoming.length === 0" class="text-slate-400 text-sm mb-6">No upcoming events.</div>
    <div v-for="(group, index) in upcoming" :key="index" class="mb-4 bg-white p-4 rounded-lg shadow-sm border border-slate-100 transition-all hover:border-blue-200">
      <div class="flex flex-row justify-between items-start">
        <div @click="seeEventDetail(group.eventId)" class="flex flex-row items-center flex-1 cursor-pointer">
          <div>
            <img
              :src="group.event.thumbnail || '../../../assets/images/mock_sub_session2.png'"
              alt="Event Image"
              class="w-14 h-14 rounded object-cover"
              onerror="this.src='/src/assets/images/mock_sub_session2.png'"
            />
          </div>
          <div class="w-5"></div>
          <div class="flex flex-col justify-center">
            <div class="font-medium text-lg text-slate-800">{{ group.event.name }}</div>
            <div class="text-sm text-slate-500 mt-0.5">
              {{ formatEventRange(group.event.eventStartDate, group.event.eventEndDate) }}
            </div>
            <div class="mt-2 flex gap-2">
              <span v-if="group.mainReg?.status" :class="statusBgColor(group.mainReg.status)" class="px-2 py-0.5 text-[10px] rounded font-semibold uppercase tracking-wider">
                {{ group.mainReg.status }}
              </span>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2 justify-end items-end">
          <button
            v-if="group.mainReg?.status === 'APPROVED'"
            @click="showQRCode(group.eventId)"
            class="text-sm bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-md border border-green-200 font-medium transition-colors"
          >
            Show QR Code
          </button>
          <button
            @click="seeEventDetail(group.eventId)"
            class="text-sm bg-slate-50 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 font-medium transition-colors"
          >
            View Event
          </button>
        </div>
      </div>
      <!-- Sub-sessions -->
      <div v-if="group.sessions.length > 0" class="mt-4 pl-[4.75rem] border-t pt-3">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Registered Sessions</div>
        <div v-for="sReg in group.sessions" :key="sReg.id" class="flex flex-row justify-between items-center py-2 border-b last:border-0 border-slate-50">
          <div class="flex flex-col">
            <div class="text-sm font-medium text-slate-700">{{ sReg.session?.name }}</div>
            <div class="text-xs text-slate-400 mt-0.5" v-if="sReg.session">{{ formatEventRange(sReg.session.startTime, sReg.session.endTime) }}</div>
          </div>
          <div>
            <span :class="statusBgColor(sReg.status)" class="px-2 py-0.5 text-[9px] rounded font-semibold uppercase tracking-wider">
              {{ sReg.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="mt-8">
    <div class="font-semibold text-xl mb-4">Ongoing</div>
    <div v-if="ongoing.length === 0" class="text-slate-400 text-sm mb-6">No ongoing events.</div>
    <div v-for="(group, index) in ongoing" :key="index" class="mb-4 bg-white p-4 rounded-lg shadow-sm border border-slate-100 transition-all hover:border-blue-200">
      <div class="flex flex-row justify-between items-start">
        <div @click="seeEventDetail(group.eventId)" class="flex flex-row items-center flex-1 cursor-pointer">
          <div>
            <img
              :src="group.event.thumbnail || '../../../assets/images/mock_sub_session2.png'"
              alt="Event Image"
              class="w-14 h-14 rounded object-cover"
              onerror="this.src='/src/assets/images/mock_sub_session2.png'"
            />
          </div>
          <div class="w-5"></div>
          <div class="flex flex-col justify-center">
            <div class="font-medium text-lg text-slate-800">{{ group.event.name }}</div>
            <div class="text-sm text-slate-500 mt-0.5">
              {{ formatEventRange(group.event.eventStartDate, group.event.eventEndDate) }}
            </div>
            <div class="mt-2 flex gap-2">
              <span v-if="group.mainReg?.status" :class="statusBgColor(group.mainReg.status)" class="px-2 py-0.5 text-[10px] rounded font-semibold uppercase tracking-wider">
                {{ group.mainReg.status }}
              </span>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2 justify-end items-end">
          <button
            v-if="group.mainReg?.status === 'APPROVED'"
            @click="showQRCode(group.eventId)"
            class="text-sm bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-md border border-green-200 font-medium transition-colors"
          >
            Show QR Code
          </button>
          <button
            @click="seeEventDetail(group.eventId)"
            class="text-sm bg-slate-50 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 font-medium transition-colors"
          >
            View Event
          </button>
        </div>
      </div>
      <!-- Sub-sessions -->
      <div v-if="group.sessions.length > 0" class="mt-4 pl-[4.75rem] border-t pt-3">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Registered Sessions</div>
        <div v-for="sReg in group.sessions" :key="sReg.id" class="flex flex-row justify-between items-center py-2 border-b last:border-0 border-slate-50">
          <div class="flex flex-col">
            <div class="text-sm font-medium text-slate-700">{{ sReg.session?.name }}</div>
            <div class="text-xs text-slate-400 mt-0.5" v-if="sReg.session">{{ formatEventRange(sReg.session.startTime, sReg.session.endTime) }}</div>
          </div>
          <div>
            <span :class="statusBgColor(sReg.status)" class="px-2 py-0.5 text-[9px] rounded font-semibold uppercase tracking-wider">
              {{ sReg.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="past.length != 0" class="mt-8 opacity-80">
    <div class="font-semibold text-xl mb-4 text-slate-600">Past</div>
    <div v-for="(group, index) in past" :key="index" class="mb-4 bg-slate-50 p-4 rounded-lg shadow-sm border border-slate-200 grayscale-[0.3]">
      <div class="flex flex-row justify-between items-start">
        <div @click="seeEventDetail(group.eventId)" class="flex flex-row items-center flex-1 cursor-pointer">
          <div>
            <img
              :src="group.event.thumbnail || '../../../assets/images/mock_sub_session2.png'"
              alt="Event Image"
              class="w-14 h-14 rounded object-cover"
              onerror="this.src='/src/assets/images/mock_sub_session2.png'"
            />
          </div>
          <div class="w-5"></div>
          <div class="flex flex-col justify-center">
            <div class="font-medium text-lg text-slate-700">{{ group.event.name }}</div>
            <div class="text-sm text-slate-500 mt-0.5">
              {{ formatEventRange(group.event.eventStartDate, group.event.eventEndDate) }}
            </div>
            <div class="mt-2 flex gap-2">
              <span v-if="group.mainReg?.status" :class="statusBgColor(group.mainReg.status)" class="px-2 py-0.5 text-[10px] rounded font-semibold uppercase tracking-wider">
                {{ group.mainReg.status }}
              </span>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2 justify-end items-end">
          <button
            @click="seeEventDetail(group.eventId)"
            class="text-sm bg-white text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-md border border-slate-300 font-medium transition-colors"
          >
            View Event
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
