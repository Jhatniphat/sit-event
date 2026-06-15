<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Search, Loader2, X, UserMinus } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import 'swiper/css'
import 'swiper/css/pagination'
import { useEventStore } from '../store/EventStore'
import { useRouter } from 'vue-router'
import { useRegistrationStore } from '@/features/registration/store/RegistrationStore'
import HeroSlider, { type HeroSlide } from '@/features/event_management/components/HeroSlider.vue'
import EventCard, { type EventItem } from '@/features/event_management/components/EventCard.vue'
import { mapEventToEventItem } from '@/features/event_management/mappers/eventMapper'
import RegistrationDialog, {
  type RegisterPayload,
  type RegistrationRole,
} from '@/features/registration/components/RegistrationDialog.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import UnregistrationDialog from '@/features/registration/components/UnregistrationDialog.vue'
import SessionSelectionDialog from '@/features/registration/components/SessionSelectionDialog.vue'
import { toast } from 'vue-sonner'
import { FormType } from '@/features/forms/services/FormServices'
import { suggestionService } from '@/features/suggestions/services/suggestion.service'
import { EventService } from '../services/EventServices'

const eventStore = useEventStore()
const events = computed(() => eventStore.events)
const currentPage = ref(1)
const currentLimit = ref(5)
const isSessionDialogOpen = ref(false)
const sessionLoading = ref(false)
const selectedEventIdForSession = ref<string | null>(null)

const authStore = useAuthStore()
const registerStore = useRegistrationStore()
const userRole = computed(() => authStore.user?.userRole)
const router = useRouter()

const isLoading = ref(false)

// --- Search & Filter State ---
const searchQuery = ref('')
const selectedTags = ref<string[]>(['ALL'])
const ALL_EVENT_TAGS = ['ALL', 'SPEAK', 'EDUCATION', 'WORKSHOP', 'SEMINAR', 'COMPETITION', 'SOCIAL', 'CAREER', 'OPENHOUSE', 'CAMP']

const isEventsLoading = computed(() => eventStore.isLoadingList)

const loadEvents = async () => {
  await eventStore.fetchAllEvents({
    page: 1,
    limit: 100,
    name: searchQuery.value,
    tags: selectedTags.value.includes('ALL') ? undefined : selectedTags.value.join(',')
  })
}

// Debounce สำหรับการพิมพ์
const debouncedSearch = useDebounceFn(() => {
  loadEvents()
}, 500)

// Watch การเปลี่ยนแปลง
watch(searchQuery, () => {
  debouncedSearch()
})

watch(selectedTags, () => loadEvents(), { deep: true })

const toggleTag = (tag: string) => {
  if (tag === 'ALL') {
    selectedTags.value = ['ALL']
  } else {
    // ถ้าเลือกอันอื่น ให้เอา 'ALL' ออกก่อน
    selectedTags.value = selectedTags.value.filter(t => t !== 'ALL')
    
    if (selectedTags.value.includes(tag)) {
      // ถ้ามีอยู่แล้วให้เอาออก (Deselect)
      selectedTags.value = selectedTags.value.filter(t => t !== tag)
    } else {
      // ถ้ายังไม่มีให้เพิ่มเข้าไป
      selectedTags.value.push(tag)
    }
    
    // ถ้าไม่เหลืออะไรเลย ให้กลับไปเลือก 'ALL'
    if (selectedTags.value.length === 0) {
      selectedTags.value = ['ALL']
    }
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedTags.value = ['ALL']
}


// ใช้ Computed เพื่อ Map ข้อมูลใหม่ทุกครั้งที่ store.events หรือ registerStore เปลี่ยนแปลง
const eventsForEventCards = computed<EventItem[]>(() => {
  let filtered = events.value

  const role = userRole.value?.toUpperCase()
  if (authStore.isAuthenticated && role) {
    if (role === 'EXTERNAL_STUDENT') {
      filtered = filtered.filter((evt) => evt.targetAudience?.includes('EXTERNAL_STUDENT'))
    }
  }

  return filtered.map((evt) =>
    mapEventToEventItem(
      evt,
      userRole.value,
      registerStore.myRegistrations,
      registerStore.myStaffStatus || [], // ใส่ fallback empty array
    ),
  )
})

const objectUrlMap = new Map<string, string>()

const fetchHeroSlides = async () => {
  console.log("fetchHeroSlides")
  try {
    const activeSuggestions = await suggestionService.getActiveSuggestions();
    
    if (activeSuggestions.length > 0) {
      let filteredSuggestions = activeSuggestions

      const role = userRole.value?.toUpperCase()
      if (authStore.isAuthenticated && role) {
        if (role === 'INTERNAL_STUDENT') {
          filteredSuggestions = filteredSuggestions.filter((s) => !s.event || s.event.targetAudience?.includes('INTERNAL_STUDENT'))
        } else if (role === 'EXTERNAL_STUDENT') {
          filteredSuggestions = filteredSuggestions.filter((s) => !s.event || s.event.targetAudience?.includes('EXTERNAL_STUDENT'))
        }
      }

      heroSlides.value = filteredSuggestions.map(s => {
        let buttonLink = undefined;
        if (s.link) buttonLink = s.link;
        else if (s.eventId) buttonLink = `/events/detail/${s.eventId}`;

        return {
          id: s.id,
          title: s.title,
          description: s.description,
          buttonText: buttonLink ? 'ดูรายละเอียด' : undefined,
          buttonLink: buttonLink,
          logos: s.icons || [],
          bgImage: s.backgroundType === 'IMAGE' ? s.backgroundImage : undefined,
          eventStartDate: s.contentDate || s.startDate
        }
      });
    } else {
      heroSlides.value = [
        {
          id: 1,
          title: 'ยินดีต้อนรับสู่ระบบกิจกรรม',
          description: 'โปรดติดตามกิจกรรมต่างๆ ของเรา',
          eventStartDate: new Date().toISOString()
        }
      ]
    }
    console.log("heroSlides", heroSlides.value)
  } catch (error) {
    console.error('Failed to fetch hero slides:', error)
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    await fetchHeroSlides()
    await loadEvents()
    if (authStore.isAuthenticated) {
      await registerStore.fetchMyRegistrations()
      await registerStore.fetchMyStaffStatus()
    }
  } catch (error: any) {
    console.error('Error fetching data:', error)
    toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล', {
      description: error?.response?.data?.message || error?.message || 'กรุณาลองใหม่อีกครั้ง',
    })
  } finally {
    isLoading.value = false
  }
})

// --- Hero Slider Data ---
const heroSlides = ref<HeroSlide[]>([])

// --- Navigation ---
const handleCardClick = (id: string) => {
  router.push({ name: 'EventDetail', params: { id } })
}

// --- Registration Logic ---
const isRegisDialogOpen = ref(false)
const currentRegistrationPayload = ref<RegisterPayload | null>(null)

const handleRegister = (payload: RegisterPayload) => {
  if (!authStore.isAuthenticated) {
    if (confirm('กรุณาเข้าสู่ระบบก่อนลงทะเบียน ต้องการไปที่หน้าเข้าสู่ระบบหรือไม่?')) {
      authStore.loginRedirect()
    }
    return
  }
  currentRegistrationPayload.value = payload
  isRegisDialogOpen.value = true
}

const onConfirmRegistration = async (eventId: string, role: RegistrationRole) => {
  if (role === null) return
  
  // กรณี STAFF ทำงานเหมือนเดิม
  if (role === 'STAFF') {
    isRegisDialogOpen.value = false // ปิด Dialog เลือก Role ทันที
    try {
      await registerStore.applyToBeStaff(eventId, { eventRole: 'STAFF' })
      toast.success('สมัคร Staff สำเร็จ', {
        description: 'คุณได้สมัครเป็น Staff สำหรับกิจกรรมนี้แล้ว',
      })
    } catch (err: any) {
        // Error Handling เดิม
        const errorMessage = err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาด'
        toast.error('การสมัคร Staff ล้มเหลว', { description: errorMessage })
    }
    return
  } 
  
  // กรณี PARTICIPANT
  // if (role === 'PARTICIPANT') {
  //   try {
  //     // 2. Fetch Sessions ของ Event นั้นๆ
  //     sessionLoading.value = true
  //     await eventStore.fetchEventSessions(eventId)
  //     const sessions = eventStore.currentEventSessions

  //     if (sessions && sessions.length > 0) {
  //       // CASE A: มี Sub-sessions -> ไปหน้าเลือก Session
  //       selectedEventIdForSession.value = eventId
  //       isRegisDialogOpen.value = false // ปิดหน้าเลือก Role
  //       isSessionDialogOpen.value = true // เปิดหน้าเลือก Session
  //     } else {
  //       // CASE B: ไม่มี Sub-sessions -> ลงทะเบียน Event ตามปกติ (Flow เดิม)
  //       isRegisDialogOpen.value = false
  //       await registerStore.registerForEvent(eventId, { sessionId: '' }) // sessionId ว่าง หรือ undefined ตาม spec เดิม
  //       toast.success('ลงทะเบียนสำเร็จ', {
  //         description: 'คุณได้ลงทะเบียนเข้าร่วมกิจกรรมเรียบร้อยแล้ว',
  //       })
  //     }
  //   } catch (err: any) {
  //      console.error(err)
  //      toast.error('เกิดข้อผิดพลาด', { description: 'ไม่สามารถตรวจสอบรอบกิจกรรมได้' })
  //      isRegisDialogOpen.value = false
  //   } finally {
  //      sessionLoading.value = false
  //   }
  // }

  if (role === 'PARTICIPANT') {
    // Find the event in the store to get its forms
    const targetEvent = events.value.find(e => e.id === eventId)
    const forms = targetEvent?.forms || []
    const preForm = forms.find(f => f.type === FormType.PRE_EVENT && f.isActive)

    if (preForm) {
      router.push({
        name: 'FormView',
        params: { id: eventId },
        query: { type: FormType.PRE_EVENT }
      })
      isRegisDialogOpen.value = false
      return
    }

    // No Pre-Event Form -> Check for Sub-sessions
    try {
      sessionLoading.value = true
      await eventStore.fetchEventSessions(eventId)
      const sessions = eventStore.currentEventSessions

      if (sessions && sessions.length > 0) {
        // CASE A: มี Sub-sessions -> ไปหน้าเลือก Session
        selectedEventIdForSession.value = eventId
        isRegisDialogOpen.value = false // ปิดหน้าเลือก Role
        isSessionDialogOpen.value = true // เปิดหน้าเลือก Session
      } else {
        // CASE B: ไม่มี Sub-sessions -> ลงทะเบียน Event ตามปกติ
        await registerStore.registerForEvent(eventId, { sessionId: '' }) // sessionId ว่าง
        toast.success('ลงทะเบียนสำเร็จ', {
          description: 'คุณได้ลงทะเบียนเข้าร่วมกิจกรรมเรียบร้อยแล้ว',
        })
        isRegisDialogOpen.value = false
      }
    } catch (err: any) {
       console.error(err)
       toast.error('เกิดข้อผิดพลาด', { description: 'ไม่สามารถตรวจสอบรอบกิจกรรมได้' })
       isRegisDialogOpen.value = false
    } finally {
       sessionLoading.value = false
    }
  }
}

const onConfirmSessionSelection = async (sessionIds: string[]) => {
  if (!selectedEventIdForSession.value) return

  sessionLoading.value = true
  try {
    // ขั้นตอนที่ 1: ลงทะเบียนเข้าร่วม Event หลักก่อน
    // (ส่ง sessionId: '' หรือ body ว่างตามที่เคยทำในกรณีไม่มี session)
    await registerStore.registerForEvent(selectedEventIdForSession.value, { sessionId: '' })

    // ขั้นตอนที่ 2: วนลูปยิง API ลงทะเบียน Sub-session ที่เลือก
    // ทำหลังจากขั้นตอนที่ 1 สำเร็จแล้วเท่านั้น
    const promises = sessionIds.map((sessionId) =>
      eventStore.registerForSession(selectedEventIdForSession.value!, sessionId)
    )

    await Promise.all(promises)

    toast.success('ลงทะเบียนสำเร็จ', {
      description: `คุณได้ลงทะเบียนเข้าร่วมกิจกรรมและจองรอบจำนวน ${sessionIds.length} รอบเรียบร้อยแล้ว`,
    })
    
    isSessionDialogOpen.value = false
    
    // อัปเดตข้อมูล local state เพื่อให้หน้าเว็บแสดงสถานะล่าสุด
    await registerStore.fetchMyRegistrations()
    
  } catch (err: any) {
    console.error(err)
    // กรณี Error ให้เช็คว่าพังที่ขั้นตอนไหน
    const errorMessage =
      err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน'
    toast.error('การลงทะเบียนล้มเหลว', { description: errorMessage })
  } finally {
    sessionLoading.value = false
  }
}

const onBackFromSession = () => {
    isSessionDialogOpen.value = false
    isRegisDialogOpen.value = true
}

// --- Unregistration Logic ---
const isUnregisDialogOpen = ref(false)
const unregisterTarget = ref<{ id: string; role: string } | null>(null)

const handleUnregister = (payload: { id: string; role: string }) => {
  unregisterTarget.value = payload
  isUnregisDialogOpen.value = true
}

const onConfirmUnregister = async () => {
  if (!unregisterTarget.value) return
  const { id, role } = unregisterTarget.value

  try {
    if (role === 'PARTICIPANT') {
      await registerStore.unregisterFromEvent(id)
      toast.success('ยกเลิกการลงทะเบียนสำเร็จ', {
        description: 'คุณได้ออกจากกิจกรรมนี้เรียบร้อยแล้ว',
      })
    } else if (role === 'STAFF') {
      await registerStore.deleteMyStaffStatus(id)
      toast.success('ยกเลิกสถานะ Staff สำเร็จ', {
        description: 'คำขอหรือสถานะ Staff ของคุณถูกลบแล้ว',
      })
    }
  } catch (err: unknown) {
    console.error(err)
    const error = err as any
    const errorMessage =
      error?.response?.data?.message || error?.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
    toast.error('การยกเลิกการลงทะเบียนล้มเหลว', {
      description: errorMessage,
    })
  } finally {
    isUnregisDialogOpen.value = false
    unregisterTarget.value = null
  }
}

onUnmounted(() => {
  for (const url of objectUrlMap.values()) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* ignore */
    }
  }
  objectUrlMap.clear()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/30">
    <HeroSlider v-if="heroSlides.length > 0" :slides="heroSlides" />

    <div class="container mx-auto p-6">
      
      <div class="mb-10 flex flex-col md:flex-row gap-4 items-center">
        <div class="relative w-full md:flex-1">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="ค้นหากิจกรรมที่คุณสนใจ..." 
            class="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-black transition-all outline-none shadow-sm text-sm"
          />
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''" 
            class="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X class="w-3 h-3 text-gray-400" />
          </button>
        </div>

        <div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto pl-2 pt-2 pb-2 pb-0 scrollbar-hide">
          <button
            v-for="tag in ALL_EVENT_TAGS"
            :key="tag"
            @click="toggleTag(tag)"
            :class="[
              'px-5 py-2.5 rounded-xl text-[11px] font-black tracking-wider transition-all whitespace-nowrap border uppercase',
              selectedTags.includes(tag)
                ? 'bg-black text-white border-black shadow-lg shadow-black/20 scale-105' 
                : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
            ]"
          >
            {{ tag === 'ALL' ? 'All Events' : tag }}
          </button>
        </div>
      </div>

      <div class="relative min-h-[400px]">
        <div v-if="isEventsLoading" class="absolute inset-0 z-10 flex justify-center pt-20 bg-gray-50/10 backdrop-blur-[1px]">
           <Loader2 class="w-10 h-10 animate-spin text-black" />
        </div>

        <div :class="{'opacity-40 transition-opacity duration-300': isEventsLoading}">
          <div v-if="eventsForEventCards.length > 0" class="flex flex-wrap -mx-4">
            <div
              v-for="event in eventsForEventCards"
              :key="event.id"
              class="w-full md:w-1/2 lg:w-1/3 px-4 mb-8"
            >
              <EventCard
                :event="event"
                @register="handleRegister"
                @unregister="handleUnregister"
                @click="handleCardClick"
              />
            </div>
          </div>

          <div v-else-if="!isEventsLoading" class="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
             <div class="bg-gray-50 p-6 rounded-full mb-4">
               <UserMinus class="w-10 h-10 text-gray-200" />
             </div>
             <h3 class="text-lg font-bold text-gray-900">No results found</h3>
             <p class="text-sm text-gray-400 mb-6">Try adjusting your search or filters to find what you're looking for.</p>
             <button 
               @click="clearFilters" 
               class="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
             >
               Clear all filters
             </button>
          </div>
        </div>
      </div>

      </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>