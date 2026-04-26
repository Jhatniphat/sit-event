<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, UserMinus, Clock, User, ArrowLeft, Loader2 } from 'lucide-vue-next'
import { useEventStore } from '../store/EventStore'
import { useDebounceFn } from '@vueuse/core'

const route = useRoute()
const router = useRouter()
const eventStore = useEventStore()

const eventId = route.params.id as string
const sessionId = route.params.sessionId as string

const isLoading = computed(() => eventStore.isLoadingRegistration)
const searchQuery = ref('')
const limit = ref(20)
const summary = computed(() => eventStore.summaryAttendance)
const currentPage = ref(1)
const paginationMeta = computed(() => eventStore.paginationParticipant)
const participants = computed(() => eventStore.allParticipants || [])

const fetchParticipants = async () => {
  const params = {
    search: searchQuery.value,
    limit: limit.value,
    page: currentPage.value,
  }
  if (sessionId) {
    await eventStore.participantsListForSession(eventId, sessionId, params)
  } else {
    await eventStore.participantsListForEvent(eventId, params)
  }
  console.log('allParticipants:', eventStore.allParticipants)
}

// ใช้ Debounce เพื่อลดภาระ Backend เวลาพิมพ์ Search (ยิงหลังจากหยุดพิมพ์ 500ms)
const debouncedSearch = useDebounceFn(() => {
  fetchParticipants()
}, 500)

onMounted(() => {
  fetchParticipants()
})

const getStatusColor = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'REJECTED':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-blue-100 text-blue-700 border-blue-200'
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  return (
    new Date(dateString).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.'
  )
}

const goBack = () => {
  router.back()
}

const changePage = (page: number) => {
  if (page >= 1 && page <= paginationMeta.value.totalPages) {
    currentPage.value = page
    fetchParticipants()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

watch([searchQuery, limit], () => {
  currentPage.value = 1
  if (searchQuery.value) {
    debouncedSearch()
  } else {
    fetchParticipants()
  }
})
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-50 pb-24 font-sans text-left">
    <div class="sticky top-0 z-30 bg-white border-b border-gray-200 p-4 space-y-3 shadow-sm">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <button
            @click="goBack"
            class="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
          >
            <ArrowLeft class="w-5 h-5 text-gray-900" />
          </button>
          <div>
            <h1 class="text-lg font-black text-gray-900 leading-none">Participants</h1>
            <p class="text-[10px] text-gray-400 font-bold uppercase mt-1">Attendance Tracking</p>
          </div>
        </div>

        <div class="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-lg">
          <label class="text-[9px] font-black text-gray-500 uppercase">Limit</label>
          <div class="relative flex items-center">
            <select
              v-model="limit"
              class="bg-transparent border-none text-[10px] font-black outline-none cursor-pointer pr-4 appearance-none"
            >
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
            <ChevronDown class="w-3 h-3 absolute right-0 pointer-events-none text-gray-400" />
          </div>
        </div>
      </div>

      <div class="relative group">
        <Search
          class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search name or email..."
          class="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none focus:bg-white focus:ring-2 focus:ring-black rounded-xl text-sm transition-all outline-none"
        />
        <div v-if="isLoading" class="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 class="w-3 h-3 text-gray-400 animate-spin" />
        </div>
      </div>
    </div>

    <div class="p-4 overflow-x-auto scrollbar-hide">
      <div class="flex gap-3 min-w-max pb-1">
        <div class="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm w-32 flex flex-col">
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-tight"
            >Registered</span
          >
          <span class="text-xl font-black text-gray-900">{{ summary?.totalRegistered || 0 }}</span>
        </div>
        <div class="bg-black p-3 rounded-2xl shadow-lg shadow-black/10 w-32 flex flex-col">
          <span class="text-[9px] font-black text-gray-500 uppercase tracking-tighter leading-tight"
            >Attended</span
          >
          <div class="flex items-baseline gap-1">
            <span class="text-xl font-black text-white">{{ summary?.totalAttended || 0 }}</span>
            <span class="text-[9px] font-bold text-green-400">{{ summary?.attendanceRate }}</span>
          </div>
        </div>
        <div class="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm w-32 flex flex-col">
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-tight"
            >Pending</span
          >
          <span class="text-xl font-black text-orange-500">{{ summary?.totalPending || 0 }}</span>
        </div>
        <div class="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm w-32 flex flex-col">
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-tight"
            >Approved</span
          >
          <span class="text-xl font-black text-green-600">{{ summary?.totalApproved || 0 }}</span>
        </div>
      </div>
    </div>

    <div class="px-4 pb-4 flex-1">
      <div v-if="isLoading && participants.length === 0" class="space-y-2">
        <div
          v-for="i in 6"
          :key="i"
          class="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse"
        ></div>
      </div>

      <div
        v-else-if="!isLoading && participants.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center text-gray-400"
      >
        <UserMinus class="w-12 h-12 mb-3 opacity-20" />
        <p class="text-sm font-bold text-gray-900">No participants found</p>
        <p class="text-xs">Adjust your search or filters</p>
      </div>

      <div v-else :class="{ 'opacity-60 transition-opacity': isLoading }" class="space-y-2">
        <div
          v-for="p in participants"
          :key="p.userId"
          class="group relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-all"
        >
          <div
            :class="[
              'absolute left-0 top-0 bottom-0 w-1.5',
              p.attended ? 'bg-green-500 shadow-[2px_0_10px_rgba(34,197,94,0.3)]' : 'bg-gray-200',
            ]"
          ></div>

          <div class="p-3 pl-5">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3 overflow-hidden">
                <div
                  class="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                >
                  <User class="w-5 h-5" />
                </div>
                <div class="flex flex-col overflow-hidden">
                  <h3 class="text-sm font-black text-gray-900 leading-tight truncate">
                    {{ p.firstName }} {{ p.lastName }}
                  </h3>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span
                      :class="[
                        'text-[8px] font-black px-1.5 py-0.5 rounded border uppercase leading-none',
                        getStatusColor(p.status),
                      ]"
                    >
                      {{ p.status }}
                    </span>
                    <p class="text-[10px] text-gray-400 truncate max-w-[120px]">{{ p.email }}</p>
                  </div>
                </div>
              </div>

              <div class="flex flex-col items-end gap-1 shrink-0">
                <div
                  :class="[
                    'px-2 py-1 rounded-lg text-[9px] font-black transition-all border',
                    p.attended
                      ? 'bg-green-50 text-green-600 border-green-100'
                      : 'bg-gray-50 text-gray-400 border-gray-100',
                  ]"
                >
                  {{ p.attended ? 'ATTENDED' : 'WAITING' }}
                </div>
                <div v-if="p.checkedInAt" class="flex items-center gap-1 text-gray-300">
                  <Clock class="w-2.5 h-2.5" />
                  <span class="text-[9px] font-bold">{{ formatDate(p.checkedInAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="paginationMeta && paginationMeta.totalPages > 1"
      class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 pb-6 flex items-center justify-between z-40"
    >
      <button
        @click="changePage(currentPage - 1)"
        :disabled="!paginationMeta.hasPrev || isLoading"
        class="flex items-center gap-1 text-[10px] font-black uppercase px-5 py-2.5 rounded-xl border border-gray-200 bg-white disabled:opacity-30 transition-all active:scale-95 shadow-sm"
      >
        Prev
      </button>

      <div class="flex flex-col items-center">
        <span class="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">Page</span>
        <div class="text-xs font-black text-gray-900">
          {{ currentPage }} <span class="text-gray-200 mx-1">/</span>
          {{ paginationMeta.totalPages }}
        </div>
      </div>

      <button
        @click="changePage(currentPage + 1)"
        :disabled="!paginationMeta.hasNext || isLoading"
        class="flex items-center gap-1 text-[10px] font-black uppercase px-5 py-2.5 rounded-xl border border-gray-200 bg-white disabled:opacity-30 transition-all active:scale-95 shadow-sm"
      >
        Next
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Hide Scrollbar */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Animations */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
