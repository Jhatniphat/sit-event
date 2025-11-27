<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const eventStore = useEventStore()
const events = computed(() => eventStore.events)
const currentPage = ref(1)
const currentLimit = ref(5)

const authStore = useAuthStore()
const registerStore = useRegistrationStore()
const userRole = computed(() => authStore.user?.userRole)
const router = useRouter()

const isLoading = ref(false)

// ใช้ Computed เพื่อ Map ข้อมูลใหม่ทุกครั้งที่ store.events หรือ registerStore เปลี่ยนแปลง
const eventsForEventCards = computed<EventItem[]>(() => {
  return events.value.map((evt) =>
    mapEventToEventItem(
        evt, 
        userRole.value, 
        registerStore.myRegistrations, 
        registerStore.myStaffStatus || [] // ใส่ fallback empty array
    ),
  )
})

onMounted(async () => {
  isLoading.value = true
  try {
    await eventStore.fetchAllEvents(currentPage.value, currentLimit.value)
    if (authStore.isAuthenticated) {
        await registerStore.fetchMyRegistrations()
        await registerStore.fetchMyStaffStatus()
    }
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    isLoading.value = false
  }
})

// --- Hero Slider Data ---
const heroSlides = ref<HeroSlide[]>([
  {
    id: 1,
    title: 'Empowering Students',
    description: "Enhance students' potential in the digital era.",
    buttonText: 'Learn More',
    eventStartDate: '2025-01-15T09:00:00Z',
    logos: ['https://www.sit.kmutt.ac.th/wp-content/uploads/2024/11/1-1024x238.png'],
  },
  {
    id: 2,
    title: 'SIT Hackathon 2025',
    description: 'Join us for 48 hours of innovation and coding.',
    buttonText: 'Register Now',
    eventStartDate: '2025-03-20T18:00:00Z',
    bgImage: 'https://www.sit.kmutt.ac.th/wp-content/uploads/2023/06/ZBT_2239-scaled.jpg',
  },
  {
    id: 3,
    title: 'Senior Project Showcase',
    description: 'Witness the incredible projects from our seniors.',
    buttonText: 'View Projects',
    eventStartDate: '2025-05-10T10:00:00Z',
  },
])

// --- Registration Logic ---
const isRegisDialogOpen = ref(false)
const currentRegistrationPayload = ref<RegisterPayload | null>(null)

const handleRegister = (payload: RegisterPayload) => {
  if (!authStore.isAuthenticated) {
     router.push('/login')
     return
  }
  currentRegistrationPayload.value = payload
  isRegisDialogOpen.value = true
}

const onConfirmRegistration = async (eventId: string, role: RegistrationRole) => {
  if (role === null) return
  try {
    if (role === 'STAFF') {
        await registerStore.applyToBeStaff(eventId, { eventRole: 'STAFF' })
    } else if (role === 'PARTICIPANT') {
        await registerStore.registerForEvent(eventId, { sessionId: '' })
    }
    // Refresh data logic is handled by reactivity (store updates -> computed updates)
  } catch (err) {
    console.error(err)
    alert("การลงทะเบียนล้มเหลว")
  }
  isRegisDialogOpen.value = false
}

// --- Unregistration Logic ---
const isUnregisDialogOpen = ref(false)
const unregisterTarget = ref<{ id: string, role: string } | null>(null)

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
        } else if (role === 'STAFF') {
            await registerStore.deleteMyStaffStatus(id)
        }
    } catch (err) {
        console.error(err)
        alert("การยกเลิกการลงทะเบียนล้มเหลว")
    } finally {
        isUnregisDialogOpen.value = false
        unregisterTarget.value = null
    }
}

// --- Thumbnail Cache Logic ---
const objectUrlMap = new Map<any, string>()

onUnmounted(() => {
  for (const url of objectUrlMap.values()) {
    try {
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }
  objectUrlMap.clear()
})
</script>

<template>
  <div class="min-h-screen">
    <div>
      <HeroSlider :slides="heroSlides" />

      <div class="container mx-auto p-6">
        <div class="flex flex-wrap -mx-4">
          <div
            v-for="event in eventsForEventCards"
            :key="event.id"
            class="w-full lg:w-1/3 px-4 mb-8"
          >
            <EventCard 
                :event="event" 
                @register="handleRegister" 
                @unregister="handleUnregister"
            />
          </div>
        </div>
      </div>

      <RegistrationDialog
        v-model:open="isRegisDialogOpen"
        :payload="currentRegistrationPayload"
        @confirm="onConfirmRegistration"
      />

      <Dialog :open="isUnregisDialogOpen" @update:open="(val) => isUnregisDialogOpen = val">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>ยืนยันการยกเลิก</DialogTitle>
                <DialogDescription>
                    คุณต้องการยกเลิกการลงทะเบียนในฐานะ 
                    <span class="font-bold text-primary">{{ unregisterTarget?.role }}</span> 
                    ใช่หรือไม่?
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" @click="isUnregisDialogOpen = false">ยกเลิก</Button>
                <Button variant="destructive" @click="onConfirmUnregister">ยืนยันการยกเลิก</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  </div>
</template>

<style scoped>
</style>