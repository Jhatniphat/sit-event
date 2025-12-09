<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventStore } from '../store/EventStore'
import { useRegistrationStore } from '@/features/registration/store/RegistrationStore'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { mapEventToEventItem } from '../mappers/eventMapper'
import { toast } from 'vue-sonner'

// UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Tag } from 'lucide-vue-next'
import RegistrationDialog, {
  type RegisterPayload,
  type RegistrationRole,
} from '@/features/registration/components/RegistrationDialog.vue'
import UnregistrationDialog from '@/features/registration/components/UnregistrationDialog.vue'

const route = useRoute()
const router = useRouter()
const eventId = route.params.id as string

const eventStore = useEventStore()
const authStore = useAuthStore()
const registerStore = useRegistrationStore()

const isLoading = ref(true)

onMounted(async () => {
  isLoading.value = true
  try {
    // โหลดข้อมูล Event
    await eventStore.fetchEventById(eventId)

    // โหลดสถานะการลงทะเบียนของผู้ใช้ (ถ้า login)
    if (authStore.isAuthenticated) {
      await registerStore.fetchMyRegistrations()
      await registerStore.fetchMyStaffStatus()
    }
  } catch (error) {
    console.error(error)
    toast.error('ไม่พบข้อมูลกิจกรรม')
    router.push('/')
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

// --- Action Button Logic ---
const isButtonDisabled = computed(() => {
  if (!eventItem.value) return true
  // ถ้ายกเลิกได้ (ลงทะเบียนแล้ว) ให้ไม่ disable
  if (eventItem.value.hasRegister) return false

  const now = new Date().getTime()
  const regEnd = new Date(eventItem.value.registrationEndDate).getTime()

  // ถ้ายังไม่ลงทะเบียน แต่หมดเวลา หรือ ไม่มีสิทธิ์ลง
  return (
    now > regEnd ||
    (!eventItem.value.canRegisterAtStaff && !eventItem.value.canRegisterAtParticipant)
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
    router.push('/login')
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

// Confirm Register
const onConfirmRegister = async (eid: string, role: RegistrationRole) => {
  if (!role) return
  try {
    if (role === 'STAFF') {
      await registerStore.applyToBeStaff(eid, { eventRole: 'STAFF' })
      toast.success('สมัคร Staff สำเร็จ')
    } else {
      await registerStore.registerForEvent(eid, { sessionId: '' })
      toast.success('ลงทะเบียนสำเร็จ')
    }
  } catch (err: any) {
    toast.error('ลงทะเบียนไม่สำเร็จ', {
      description: err?.response?.data?.message || err.message,
    })
  }
  isRegisDialogOpen.value = false
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
        <div class="md:col-span-2 space-y-6">
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

    <UnregistrationDialog
      v-model:open="isUnregisDialogOpen"
      :targetRole="unregisterRole"
      @confirm="onConfirmUnregister"
    />
  </div>
</template>
