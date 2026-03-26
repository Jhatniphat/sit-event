<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Search, UserMinus, Clock, User, ChevronDown } from 'lucide-vue-next'
import { useEventStore } from '../store/EventStore'
import { useDebounceFn } from '@vueuse/core' // แนะนำให้ลง npm i @vueuse/core เพื่อใช้ debounce

const route = useRoute()
const eventStore = useEventStore()

const eventId = route.params.eventId as string
const sessionId = route.params.sessionId as string

const isLoading = computed(() => eventStore.isLoadingRegistration)
const searchQuery = ref('')
const limit = ref(20) // ค่าเริ่มต้นของ Limit

// ฟังก์ชันหลักในการดึงข้อมูลจาก Backend
const fetchParticipants = async () => {
  await eventStore.participantsListForSession(eventId, sessionId, {
    search: searchQuery.value,
    limit: limit.value,
    offset: 0
  })
}

// ใช้ Debounce เพื่อลดภาระ Backend เวลาพิมพ์ Search (ยิงหลังจากหยุดพิมพ์ 500ms)
const debouncedSearch = useDebounceFn(() => {
  fetchParticipants()
}, 500)

// เฝ้าดูการเปลี่ยนแปลงของ Search Query
watch(searchQuery, () => {
  debouncedSearch()
})

// เฝ้าดูการเปลี่ยนแปลงของ Limit (ถ้าเปลี่ยนให้โหลดใหม่ทันที)
watch(limit, () => {
  fetchParticipants()
})

onMounted(() => {
  fetchParticipants()
})

const getStatusColor = (status: string) => {
  switch (status) {
    case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200'
    case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200'
    default: return 'bg-blue-100 text-blue-700 border-blue-200'
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit' 
  }) + ' น.'
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-50 pb-10">
    <div class="sticky top-0 z-30 bg-white border-b border-gray-200 p-4 space-y-4 shadow-sm">
      <div class="flex justify-between items-center">
        <h1 class="text-xl font-bold text-gray-900 leading-tight">Participants</h1>
        
        <div class="relative flex items-center gap-2">
          <label class="text-[10px] font-bold text-gray-400 uppercase">Limit</label>
          <select 
            v-model="limit" 
            class="appearance-none bg-gray-100 border-none rounded-lg px-3 py-1 pr-8 text-xs font-bold focus:ring-2 focus:ring-black outline-none cursor-pointer"
          >
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
        </div>
      </div>

      <div class="relative group">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search name or email..." 
          class="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent rounded-2xl text-sm transition-all outline-none"
        />
        <div v-if="isLoading" class="absolute right-3 top-1/2 -translate-y-1/2">
          <div class="w-3 h-3 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
        </div>
      </div>
    </div>

    <div class="p-4 flex-1">
      <div v-if="!isLoading && eventStore.allParticipants.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="bg-gray-100 p-4 rounded-full mb-3">
          <UserMinus class="w-8 h-8 text-gray-400" />
        </div>
        <p class="text-gray-900 font-bold">No participants found</p>
        <p class="text-xs text-gray-500">Try adjusting your search or limit.</p>
      </div>

      <div class="space-y-3">
        <div 
          v-for="p in eventStore.allParticipants" 
          :key="p.userId"
          class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 overflow-hidden">
              <div class="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white shrink-0 shadow-md">
                <User class="w-5 h-5" />
              </div>
              <div class="flex flex-col overflow-hidden">
                <span class="text-sm font-bold text-gray-900 truncate">
                  {{ p.firstName }} {{ p.lastName }}
                </span>
                <span class="text-[11px] text-gray-500 truncate italic">
                  {{ p.email }}
                </span>
              </div>
            </div>
            
            <span :class="['text-[9px] font-black px-2 py-1 rounded-md border uppercase shrink-0', getStatusColor(p.status)]">
              {{ p.status }}
            </span>
          </div>

          <hr class="my-3 border-gray-50" />

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <div :class="['w-2 h-2 rounded-full', p.attended ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-300']"></div>
              <span class="text-[10px] font-black tracking-wider text-gray-600">
                {{ p.attended ? 'CHECKED IN' : 'WAITING' }}
              </span>
            </div>
            
            <div v-if="p.checkedInAt" class="flex items-center gap-1 text-gray-400">
              <Clock class="w-3 h-3" />
              <span class="text-[10px] font-medium">{{ formatDate(p.checkedInAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>