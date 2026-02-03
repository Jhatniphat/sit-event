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
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import UnregistrationDialog from '@/features/registration/components/UnregistrationDialog.vue'
import SessionSelectionDialog from '@/features/registration/components/SessionSelectionDialog.vue'
import { toast } from 'vue-sonner'
import { FormType } from '@/features/forms/services/FormServices'

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

// ใช้ Computed เพื่อ Map ข้อมูลใหม่ทุกครั้งที่ store.events หรือ registerStore เปลี่ยนแปลง
const eventsForEventCards = computed<EventItem[]>(() => {
  return events.value.map((evt) =>
    mapEventToEventItem(
      evt,
      userRole.value,
      registerStore.myRegistrations,
      registerStore.myStaffStatus || [], // ใส่ fallback empty array
    ),
  )
})

const objectUrlMap = new Map<string, string>()

onMounted(async () => {
  isLoading.value = true
  try {
    await eventStore.fetchAllEvents(currentPage.value, 100) // ดึงข้อมูลทั้งหมดมาเลย
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
const heroSlides = ref<HeroSlide[]>([
    {
    id: 1,
    title: 'SIT Hackathon 2025',
    description: 'Join us for 48 hours of innovation and coding.',
    buttonText: 'Register Now',
    eventStartDate: '2025-03-20T18:00:00Z',
    bgImage: 'https://www.sit.kmutt.ac.th/wp-content/uploads/2023/06/ZBT_2239-scaled.jpg',
  },
  {
    id: 2,
    title: 'Empowering Students',
    description: "Enhance students' potential in the digital era.",
    buttonText: 'Learn More',
    eventStartDate: '2025-01-15T09:00:00Z',
    logos: ['https://www.sit.kmutt.ac.th/wp-content/uploads/2024/11/1-1024x238.png'],
  },
  {
    id: 3,
    title: 'Senior Project Showcase',
    description: 'Witness the incredible projects from our seniors.',
    buttonText: 'View Projects',
    eventStartDate: '2025-05-10T10:00:00Z',
  },
])

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
              @click="handleCardClick"
            />
          </div>
        </div>
      </div>

      <RegistrationDialog
        v-model:open="isRegisDialogOpen"
        :payload="currentRegistrationPayload"
        @confirm="onConfirmRegistration"
      />

      <!-- <Dialog :open="isUnregisDialogOpen" @update:open="(val) => isUnregisDialogOpen = val">
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
      </Dialog> -->

      <SessionSelectionDialog
        v-model:open="isSessionDialogOpen"
        :sessions="eventStore.currentEventSessions"
        :isLoading="sessionLoading"
        @confirm="onConfirmSessionSelection"
        @back="onBackFromSession"
      />

      <UnregistrationDialog
        v-model:open="isUnregisDialogOpen"
        :targetRole="unregisterTarget?.role"
        @confirm="onConfirmUnregister"
      />
    </div>
  </div>
</template>

<style scoped></style>
