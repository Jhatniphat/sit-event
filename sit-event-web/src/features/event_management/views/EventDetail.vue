<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventStore } from '../store/EventStore'
import { useRegistrationStore } from '@/features/registration/store/RegistrationStore'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { mapEventToEventItem } from '../mappers/eventMapper'
import { toast } from 'vue-sonner'
import { FormType } from '@/features/forms/services/FormServices'

// UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Tag, Users } from 'lucide-vue-next'
import RegistrationDialog, {
  type RegisterPayload,
  type RegistrationRole,
} from '@/features/registration/components/RegistrationDialog.vue'
import UnregistrationDialog from '@/features/registration/components/UnregistrationDialog.vue'
// [1] Import Session Dialog
import SessionSelectionDialog from '@/features/registration/components/SessionSelectionDialog.vue'

const route = useRoute()
const router = useRouter()
const eventId = route.params.id as string

const eventStore = useEventStore()
const authStore = useAuthStore()
const registerStore = useRegistrationStore()

const isLoading = ref(true)

// [2] State สำหรับ Session Dialog
const isSessionDialogOpen = ref(false)
const sessionLoading = ref(false) // ใช้ตอนกด confirm แล้ว loading (ถ้าต้องการ)

onMounted(async () => {
  isLoading.value = true
  try {
    // 1. โหลดข้อมูล Event
    await eventStore.fetchEventById(eventId)
    
    if (eventStore.error || !eventStore.currentEvent || eventStore.currentEvent.id !== eventId) {
      throw new Error(eventStore.error || 'ไม่พบข้อมูลกิจกรรม')
    }

    // 2. โหลดข้อมูล Sub-Sessions
    await eventStore.fetchEventSessions(eventId)

    // 3. โหลดสถานะการลงทะเบียนของผู้ใช้ (ถ้า login)
    if (authStore.isAuthenticated) {
      await registerStore.fetchMyRegistrations()
      await registerStore.fetchMyStaffStatus()
    }
  } catch (error: any) {
    console.error(error)
    toast.error(error?.response?.data?.message || error.message || 'เกิดข้อผิดพลาด')
    router.replace({ path: '/404', query: { error: 'event' } })
  } finally {
    isLoading.value = false
  }
})

// แปลงข้อมูล Event ให้มี status การลงทะเบียน (hasRegister)
const eventItem = computed(() => {
  if (!eventStore.currentEvent) return null
  return mapEventToEventItem(
    eventStore.currentEvent,
    authStore.user?.userRole,
    registerStore.myRegistrations,
    registerStore.myStaffStatus || [],
  )
})

// --- Formatter Helpers ---
const formatDate = (dateStr: string | Date) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatSessionTime = (start: string, end: string) => {
  const startDate = new Date(start)
  const endDate = new Date(end)
  
  const dateOpt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const timeOpt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }

  return `${startDate.toLocaleDateString('th-TH', dateOpt)} ${startDate.toLocaleTimeString('th-TH', timeOpt)} - ${endDate.toLocaleTimeString('th-TH', timeOpt)}`
}

// --- Action Button Logic ---
const isButtonDisabled = computed(() => {
  if (!eventItem.value) return true
  if (eventItem.value.hasRegister) return false

  const now = new Date().getTime()
  const regEnd = new Date(eventItem.value.registrationEndDate).getTime()

  return (
    now > regEnd 
  )
})

const buttonText = computed(() => {
  if (!eventItem.value) return 'Loading...'
  if (eventItem.value.hasRegister) return 'ยกเลิกการลงทะเบียน'

  const now = new Date().getTime()
  const regEnd = new Date(eventItem.value.registrationEndDate).getTime()
  if (now > regEnd) return 'ปิดรับสมัครแล้ว'

  return 'ลงทะเบียนเข้าร่วม'
})

// --- Registration / Unregistration Dialogs ---
const isRegisDialogOpen = ref(false)
const isUnregisDialogOpen = ref(false)
const currentPayload = ref<RegisterPayload | null>(null)
const unregisterRole = ref('')

const handleActionClick = () => {
  if (!eventItem.value) return

  if (!authStore.isAuthenticated) {
     if (confirm('กรุณาเข้าสู่ระบบก่อนลงทะเบียน ต้องการไปที่หน้าเข้าสู่ระบบหรือไม่?')) {
        authStore.loginRedirect()
     }
    return
  }

  // กรณีลงทะเบียนแล้ว -> เปิด Unregister Dialog
  if (eventItem.value.hasRegister) {
    unregisterRole.value = eventItem.value.hasRegister
    isUnregisDialogOpen.value = true
  }
  // กรณีจอง -> เปิด Register Dialog
  else {
    currentPayload.value = {
      id: eventItem.value.id,
      canRegisterAtStaff: eventItem.value.canRegisterAtStaff,
      canRegisterAtParticipant: eventItem.value.canRegisterAtParticipant,
    }
    isRegisDialogOpen.value = true
  }
}

// [3] ปรับ Logic Confirm Register
const onConfirmRegister = async (eid: string, role: RegistrationRole) => {
  if (!role) return

  // กรณี Staff (เหมือนเดิม)
  if (role === 'STAFF') {
    try {
      await registerStore.applyToBeStaff(eid, { eventRole: 'STAFF' })
      toast.success('สมัคร Staff สำเร็จ')
    } catch (err: any) {
      toast.error('สมัคร Staff ไม่สำเร็จ', {
        description: err?.response?.data?.message || err.message,
      })
    }
    isRegisDialogOpen.value = false
    return
  } 
  
  // กรณี Participant
  if (role === 'PARTICIPANT') {
    // Check for Pre-Event Form
    const forms = eventStore.currentEvent?.forms || []
    const preForm = forms.find(f => f.type === FormType.PRE_EVENT && f.isActive)

    if (preForm) {
      router.push({
        name: 'FormView',
        params: { id: eid },
        query: { type: FormType.PRE_EVENT }
      })
      isRegisDialogOpen.value = false
      return
    }

    // เช็คว่ามี Sub-session หรือไม่ (ใช้จาก store ที่ fetch มาตอน onMounted)
    const sessions = eventStore.currentEventSessions
    
    if (sessions && sessions.length > 0) {
        // CASE A: มี Session -> ปิด Dialog เลือก Role แล้วไปเปิด Dialog เลือก Session
        isRegisDialogOpen.value = false
        isSessionDialogOpen.value = true
    } else {
        // CASE B: ไม่มี Session -> ลงทะเบียนเลย (เหมือนเดิม)
        try {
            await registerStore.registerForEvent(eid, { sessionId: '' })
            toast.success('ลงทะเบียนสำเร็จ')
            isRegisDialogOpen.value = false
        } catch (err: any) {
            toast.error('ลงทะเบียนไม่สำเร็จ', {
                description: err?.response?.data?.message || err.message,
            })
        }
    }
  }
}

// [4] เพิ่ม Logic ยืนยันการเลือก Session
const onConfirmSessionSelection = async (sessionIds: string[]) => {
  if (!eventItem.value) return
  
  sessionLoading.value = true
  try {
    // ขั้นตอนที่ 1: ลงทะเบียนเข้าร่วม Event หลัก
    await registerStore.registerForEvent(eventItem.value.id, { sessionId: '' })

    // ขั้นตอนที่ 2: ลงทะเบียน Sub-session ตามรายการที่เลือก
    const promises = sessionIds.map((sessionId) =>
      eventStore.registerForSession(eventItem.value!.id, sessionId)
    )

    await Promise.all(promises)

    toast.success('ลงทะเบียนสำเร็จ', {
      description: `คุณได้ลงทะเบียนเข้าร่วมกิจกรรมและจองรอบจำนวน ${sessionIds.length} รอบเรียบร้อยแล้ว`,
    })
    
    isSessionDialogOpen.value = false
    
    // อัปเดตข้อมูล
    await registerStore.fetchMyRegistrations()
    // อาจจะ reload ข้อมูล event อีกครั้งเพื่อ update จำนวนที่นั่งแบบ realtime (ถ้า API รองรับ)
    await eventStore.fetchEventSessions(eventItem.value.id)

  } catch (err: any) {
    console.error(err)
    const errorMessage =
      err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน'
    toast.error('การลงทะเบียนล้มเหลว', { description: errorMessage })
  } finally {
    sessionLoading.value = false
  }
}

// (Optional) ปุ่มย้อนกลับจากหน้าเลือก Session
const onBackFromSession = () => {
    isSessionDialogOpen.value = false
    isRegisDialogOpen.value = true
}

// Confirm Unregister
const onConfirmUnregister = async () => {
  if (!eventItem.value) return
  try {
    if (unregisterRole.value === 'PARTICIPANT') {
      await registerStore.unregisterFromEvent(eventItem.value.id)
      toast.success('ยกเลิกการลงทะเบียนสำเร็จ')
    } else if (unregisterRole.value === 'STAFF') {
      await registerStore.deleteMyStaffStatus(eventItem.value.id)
      toast.success('ยกเลิกสถานะ Staff สำเร็จ')
    }
  } catch (err: any) {
    toast.error('ยกเลิกไม่สำเร็จ', {
      description: err?.response?.data?.message || err.message,
    })
  } finally {
    isUnregisDialogOpen.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/30 pb-10">
    <div v-if="isLoading" class="container mx-auto p-6 space-y-4 text-center">
      <p>Loading event details...</p>
    </div>

    <div v-else-if="eventItem" class="container mx-auto p-4 md:p-8 max-w-5xl">
      <div
        class="w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden shadow-md mb-8 bg-gray-200"
      >
        <img
          v-if="eventItem.thumbnail"
          :src="eventItem.thumbnail"
          alt="Event Cover"
          class="w-full h-full object-cover"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="md:col-span-2 space-y-8">
          
          <div class="space-y-6">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ eventItem.name }}</h1>
              <div class="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary" class="text-xs">SIT Event</Badge>
              </div>
            </div>

            <div class="prose max-w-none text-gray-700">
              <h3 class="text-xl font-semibold text-gray-900 mb-2">รายละเอียดกิจกรรม</h3>
              <p class="whitespace-pre-line">{{ eventItem.description }}</p>
            </div>
          </div>

          <div>
            <h3 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar class="w-5 h-5" />
              กำหนดการ / Sub-sessions
            </h3>

            <div v-if="eventStore.currentEventSessions.length > 0" class="space-y-4">
              <div 
                v-for="session in eventStore.currentEventSessions" 
                :key="session.id"
                class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div class="flex flex-col sm:flex-row justify-between gap-4">
                  <div class="space-y-2 flex-1">
                    <h4 class="font-bold text-lg text-gray-800">{{ session.name }}</h4>
                    <p class="text-gray-600 text-sm whitespace-pre-line line-clamp-2">
                      {{ session.description }}
                    </p>
                    
                    <div class="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                      <div class="flex items-center gap-1.5">
                        <Clock class="w-4 h-4 text-primary" />
                        <span>{{ formatSessionTime(session.startTime, session.endTime) }}</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <MapPin class="w-4 h-4 text-primary" />
                        <span>{{ session.location }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 min-w-[100px]">
                    <Badge variant="outline" class="flex items-center gap-1 px-3 py-1">
                      <Users class="w-3 h-3" />
                      <span v-if="session.maxSeats !== null && session.maxSeats !== undefined">
                        {{ session.availableSeats }}/{{ session.maxSeats }} seats
                      </span>
                      <span v-else>ไม่จำกัดที่นั่ง</span>
                    </Badge>
                    <Badge 
                      v-if="session.maxSeats !== null && session.maxSeats !== undefined && session.availableSeats !== null && session.availableSeats <= 0" 
                      variant="destructive" 
                      class="text-xs px-2 py-0.5"
                    >
                      เต็มแล้ว
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
              <div class="p-3 bg-gray-100 rounded-full mb-3">
                <Calendar class="w-6 h-6 text-gray-400" />
              </div>
              <p class="text-gray-500 font-medium">ไม่มีรายการ Sub-session สำหรับกิจกรรมนี้</p>
            </div>
          </div>

        </div>

        <div class="space-y-6">
          <div class="bg-white p-6 rounded-xl border shadow-sm space-y-6 sticky top-4">
            <div class="space-y-4">
              <Button
                class="w-full text-lg h-12"
                :variant="eventItem.hasRegister ? 'destructive' : 'default'"
                :disabled="isButtonDisabled"
                @click="handleActionClick"
              >
                {{ buttonText }}
              </Button>
              <p
                v-if="eventItem.hasRegister"
                class="text-center text-sm text-green-600 font-medium"
              >
                คุณลงทะเบียนในฐานะ {{ eventItem.hasRegister }} แล้ว
              </p>
            </div>

            <hr />

            <div class="space-y-4 text-sm">
              <div class="flex items-start gap-3">
                <Calendar class="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p class="font-semibold">วันจัดกิจกรรม</p>
                  <p class="text-gray-600">เริ่ม: {{ formatDate(eventItem.eventStartDate) }}</p>
                  <p class="text-gray-600">สิ้นสุด: {{ formatDate(eventItem.eventEndDate) }}</p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <Clock class="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p class="font-semibold">ช่วงเวลารับสมัคร</p>
                  <p class="text-gray-600">
                    เริ่ม: {{ formatDate(eventStore.currentEvent?.registrationOpenDate || '') }}
                  </p>
                  <p class="text-gray-600">
                    สิ้นสุด: {{ formatDate(eventItem.registrationEndDate) }}
                  </p>
                </div>
              </div>

              <div v-if="(eventStore.currentEvent as any)?.maxSeats" class="flex items-start gap-3">
                <Users class="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p class="font-semibold">จำนวนที่นั่ง (Event)</p>
                  <p class="text-gray-600">{{ (eventStore.currentEvent as any).maxSeats }} ที่นั่ง</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <RegistrationDialog
      v-model:open="isRegisDialogOpen"
      :payload="currentPayload"
      @confirm="onConfirmRegister"
    />

    <SessionSelectionDialog
      v-model:open="isSessionDialogOpen"
      :sessions="eventStore.currentEventSessions"
      :isLoading="sessionLoading"
      @confirm="onConfirmSessionSelection"
      @back="onBackFromSession"
    />

    <UnregistrationDialog
      v-model:open="isUnregisDialogOpen"
      :targetRole="unregisterRole"
      @confirm="onConfirmUnregister"
    />
  </div>
</template>