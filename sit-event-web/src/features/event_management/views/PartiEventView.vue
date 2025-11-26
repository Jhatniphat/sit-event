<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import 'swiper/css'
import 'swiper/css/pagination'
import { useEventStore } from '../store/EventStore'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useRegistrationStore } from '@/features/registration/store/RegistrationStore'
import HeroSlider, { type HeroSlide } from '@/features/event_management/components/HeroSlider.vue'
import EventCard, { type EventItem } from '@/features/event_management/components/EventCard.vue'
import { mapEventToEventItem } from '@/features/event_management/mappers/eventMapper'
import { type Event } from '@/features/event_management/services/EventServices'
import RegistrationDialog , { type RegisterPayload , type RegistrationRole }  from '@/features/registration/components/RegistrationDialog.vue'

// const isOpenMenu = ref(false)
// const menuRef = ref<HTMLElement | null>(null)
// const menuButton = ref<HTMLElement | null>(null)
const eventStore = useEventStore()
const events = computed(() => eventStore.events)
// const paginations = computed(() => eventStore.pagination)
const currentPage = ref(1)
const currentLimit = ref(5)
// const router = useRouter()
const authStore = useAuthStore()
const registerStore = useRegistrationStore()
const userRole = computed(() => authStore.user?.userRole)

// const handlePageChange = async (page: number) => {
//   await eventStore.fetchAllEvents(page, currentLimit.value)
//   currentPage.value = page
// }

// const handleLimitChange = async (newLimit: number) => {
//   currentLimit.value = newLimit
//   currentPage.value = 1
//   await eventStore.fetchAllEvents(1, newLimit)
// }

const eventsForEventCards = ref<EventItem[]>([])

onMounted(async () => {
  isLoading.value = true
  try {
    await eventStore.fetchAllEvents(currentPage.value, currentLimit.value)
    await registerStore.fetchMyRegistrations()
    await registerStore.fetchMyStaffStatus()
    eventsForEventCards.value = events.value.map((evt: Event) => mapEventToEventItem(evt,userRole.value))
  } catch (error) {
    console.error('Error fetching events:', error)
  } finally {
    isLoading.value = false
  }
})

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

const isLoading = ref(false)
// const errorMessage = ref('')

// function formatDate(date: string | number | Date) {
//   return new Date(date).toLocaleDateString('en-US', {
//     month: 'short',
//     day: '2-digit',
//     year: 'numeric',
//   })
// }

// const goToPage = (path: string) => {
//   router.push(path)
// }

//
const isDialogOpen = ref(false)
const currentRegistrationPayload = ref<RegisterPayload | null>(null)

// Function ที่รับ event @register จาก EventCard
const handleRegister = (payload: RegisterPayload) => {
  console.log('Open dialog for:', payload.id)
  currentRegistrationPayload.value = payload
  isDialogOpen.value = true
}

// Function ที่รับ event ยืนยันจาก Dialog เพื่อยิง API ต่อไป
const onConfirmRegistration = async (eventId: string, role: RegistrationRole) => {
  console.log(`Registering event ${eventId} as ${role}`)
  if (role === null) return
  if (role === 'STAFF') {
    await registerStore.applyToBeStaff(eventId, {eventRole : 'STAFF'})
  } else if (role === 'PARTICIPANT') {
    await registerStore.registerForEvent(eventId, {sessionId : ''})
  }
  isDialogOpen.value = false
}
</script>

<template>
  <div class="min-h-screen">
    <div>
      <!-- Swiper Section -->
      <HeroSlider :slides="heroSlides" />

      <!-- Upcoming Events Section -->
      <div class="container mx-auto p-6">
        <div class="flex flex-wrap -mx-4">
          <div v-for="event in eventsForEventCards" :key="event.id" class="w-full lg:w-1/3 px-4 mb-8">
            <EventCard :event="event" @register="handleRegister" />
          </div>
        </div>
      </div>

      <RegistrationDialog 
      v-model:open="isDialogOpen"
      :payload="currentRegistrationPayload"
      @confirm="onConfirmRegistration"
    />

    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.swiper-pagination-bullet {
  background-color: rgba(0, 0, 0, 0.4);
  width: 10px;
  height: 10px;
  opacity: 1;
  transition: all 0.3s;
}

.swiper-pagination-bullet-active {
  background-color: white;
  width: 20px;
  border-radius: 10px;
}
:deep(.swiper-pagination) {
  background: rgba(10, 30, 50, 0.6); /* ดำเข้มหน่อย */
  padding: 5px 5px;
  border-radius: 9999px;
  bottom: 16px !important;
  width: auto !important;
  left: 50%;
  transform: translateX(-50%);
  display: flex !important;
  justify-content: center;
  align-items: center;
  gap: 2px;
}

:deep(.swiper-pagination-bullet) {
  width: 7px;
  height: 7px;
  background: rgba(255, 255, 255, 0.35); /* เทาอ่อน */
  opacity: 1;
  transition: all 0.3s ease;
}

:deep(.swiper-pagination-bullet-active) {
  background: #ffffff; /* จุด active เป็นขาว */
  width: 7px;
  height: 7px;
}

.desc-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal; /* ✅ อนุญาตให้ขึ้นบรรทัดใหม่ได้ */
  word-break: break-word; /* ✅ ตัดคำกลางประโยคได้ถ้าคำยาวเกิน */
}

.icon {
  width: 22px;
  height: 22px;
  color: slategrey; /* สี default */
}
</style>
