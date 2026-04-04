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

const fetchParticipants = async () => {
  if (sessionId) {
    await eventStore.participantsListForSession(eventId, sessionId, {
      search: searchQuery.value,
      limit: limit.value,
      offset: 0,
    })
  } else {
    await eventStore.participantsListForEvent(eventId, {
      search: searchQuery.value,
      limit: limit.value,
      offset: 0,
    })
  }
  console.log('allParticipants:', eventStore.allParticipants)
}

// ใช้ Debounce เพื่อลดภาระ Backend เวลาพิมพ์ Search (ยิงหลังจากหยุดพิมพ์ 500ms)
const debouncedSearch = useDebounceFn(() => {
  fetchParticipants()
}, 500)

watch(searchQuery, () => {
  debouncedSearch()
})

watch(limit, () => {
  fetchParticipants()
})

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
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-50 pb-10 font-sans">
    <div class="sticky top-0 z-30 bg-white border-b border-gray-200 p-4 space-y-4 shadow-sm">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-3">
          <button
            @click="goBack"
            class="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
          >
            <ArrowLeft class="w-6 h-6 text-gray-900" />
          </button>
          <div>
            <h1 class="text-xl font-black text-gray-900 leading-none">Participants</h1>
            <p class="text-[10px] text-gray-400 font-bold uppercase mt-1">Attendance Tracking</p>
          </div>
        </div>

        <div class="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-lg">
          <label class="text-[9px] font-black text-gray-500 uppercase">Limit</label>
          <select
            v-model="limit"
            class="bg-transparent border-none text-xs font-black outline-none cursor-pointer"
          >
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>

      <div class="relative group">
        <Search
          class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name..."
          class="w-full pl-11 pr-4 py-3.5 bg-gray-100 border-none focus:bg-white focus:ring-2 focus:ring-black rounded-2xl text-sm font-medium transition-all outline-none shadow-inner"
        />
        <div v-if="isLoading" class="absolute right-4 top-1/2 -translate-y-1/2">
          <Loader2 class="w-4 h-4 text-gray-400 animate-spin" />
        </div>
      </div>
    </div>

    <div class="px-1 py-4 flex-1">
      <div v-if="isLoading && eventStore.allParticipants.length === 0" class="space-y-3">
        <div
          v-for="i in 5"
          :key="i"
          class="h-28 bg-white rounded-3xl border border-gray-100 animate-pulse"
        ></div>
      </div>

      <div
        v-else-if="!isLoading && eventStore.allParticipants.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <div class="bg-gray-100 p-4 rounded-full mb-3">
          <UserMinus class="w-8 h-8 text-gray-400" />
        </div>
        <p class="text-gray-900 font-bold">No results found</p>
      </div>

      <div v-else :class="{ 'opacity-60 transition-opacity': isLoading }" class="space-y-4">
        <div
          v-for="p in eventStore.allParticipants"
          :key="p.userId"
          class="relative bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.97] transition-all"
        >
          <div
            :class="[
              'absolute left-0 top-0 bottom-0 w-2',
              p.attended ? 'bg-green-500' : 'bg-gray-200',
            ]"
          ></div>

          <div class="p-5 pl-7">
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                >
                  <User class="w-6 h-6" />
                </div>
                <div class="flex flex-col">
                  <h3 class="text-base font-black text-gray-900 leading-tight">
                    {{ p.firstName }} {{ p.lastName }}
                  </h3>
                  <p class="text-xs text-gray-400 font-medium truncate max-w-[150px]">
                    {{ p.email }}
                  </p>
                </div>
              </div>

              <div
                :class="[
                  'px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest transition-all shadow-sm border',
                  p.attended
                    ? 'bg-green-500 text-white border-green-600'
                    : 'bg-white text-gray-400 border-gray-200',
                ]"
              >
                {{ p.attended ? 'CHECKED IN' : 'WAITING' }}
              </div>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-gray-50">
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'text-[9px] font-black px-2 py-0.5 rounded-md border uppercase',
                    getStatusColor(p.status),
                  ]"
                >
                  {{ p.status }}
                </span>
              </div>

              <div class="flex items-center gap-1.5 text-gray-400">
                <Clock class="w-3.5 h-3.5" />
                <span class="text-[10px] font-bold">
                  {{ p.attended ? formatDate(p.checkedInAt) : 'Not recorded' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
