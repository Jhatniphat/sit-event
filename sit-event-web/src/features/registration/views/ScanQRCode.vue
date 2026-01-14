<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { QrcodeStream } from 'vue-qrcode-reader'
import { useRegistrationStore } from '@/features/registration/store/RegistrationStore'
import { useEventStore } from '@/features/event_management/store/EventStore' // [NEW] เรียก EventStore
import { toast } from 'vue-sonner'
import { Loader2, ChevronDown } from 'lucide-vue-next'

// --- Components (Shadcn) ---
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select' // [NEW] ใช้ Select ของ Shadcn (หรือใช้ HTML select ธรรมดาก็ได้)

// --- Interfaces ---
interface ScannedUser {
  eventId: string
  userId: string
  firstName: string
  lastName: string
}

interface DetectedBarcode {
  rawValue: string
  boundingBox?: DOMRectReadOnly
  format?: string
  cornerPoints?: { x: number; y: number }[]
}

// --- State ---
const route = useRoute()
const registrationStore = useRegistrationStore()
const eventStore = useEventStore() // [NEW]
const eventIdFromRoute = route.params.id as string

const scannedData = ref<ScannedUser | null>(null)
const showDialog = ref(false)
const isPaused = ref(false)
const isProcessing = ref(false)
const errorMsg = ref('')

// [NEW] State สำหรับเลือกโหมด Check-in
// targetId: 'main' = Event หลัก, หรือเป็น sessionId = Sub-session นั้นๆ
const selectedTargetId = ref<string>('main') 
// [NEW] Dialog สำหรับกรณีต้อง Check-in Event ก่อน
const showChainCheckInDialog = ref(false) 

// --- Computed ---
const sessions = computed(() => eventStore.currentEventSessions)
const currentEventName = computed(() => eventStore.currentEvent?.name || 'Event')

// ชื่อของ Target ที่กำลังเลือกอยู่ (ไว้แสดงใน Dialog)
const selectedTargetName = computed(() => {
    if (selectedTargetId.value === 'main') return 'Event หลัก'
    const session = sessions.value.find(s => s.id === selectedTargetId.value)
    return session ? `Session: ${session.name}` : 'Unknown Session'
})

// --- Lifecycle ---
onMounted(async () => {
    // ดึงข้อมูล Event และ Session เพื่อมาใส่ใน Dropdown List
    await eventStore.fetchEventById(eventIdFromRoute)
    await eventStore.fetchEventSessions(eventIdFromRoute)
})

// --- Functions ---

const parseQRData = (content: string): ScannedUser | null => {
  const parts = content.split('_')
  if (parts.length !== 4) return null
  const [eventId, userId, firstName, lastName] = parts as [string, string, string, string]
  return { eventId, userId, firstName, lastName }
}

const onDetect = async (detectedCodes: DetectedBarcode[]) => {
  if (isPaused.value || detectedCodes.length === 0) return

  const result = detectedCodes[0]!.rawValue
  if (!result) return

  const parsedObj = parseQRData(result)
  
  if (!parsedObj) {
    toast.error('รูปแบบ QR Code ไม่ถูกต้อง')
    pauseCameraTemporary()
    return
  }

  // Check Event ID Matches
  if (parsedObj.eventId !== eventIdFromRoute) {
    toast.error('QR Code นี้ไม่ใช่ของกิจกรรมนี้', {
        description: `QR Event: ${parsedObj.eventId}`
    })
    pauseCameraTemporary()
    return
  }

  isPaused.value = true
  isProcessing.value = true

  try {
    // Mock Active Check (เหมือนเดิม)
    const isActive = true 
    
    if (!isActive) {
        toast.warning('ผู้เข้าร่วมไม่ได้เปิดหน้า QR Code อยู่')
        closeDialog()
    } else {
        scannedData.value = parsedObj
        showDialog.value = true
    }
  } catch (error) {
    toast.error('เกิดข้อผิดพลาดในการตรวจสอบสถานะ')
    closeDialog()
  } finally {
    isProcessing.value = false
  }
}

// Function หลักในการ Check-in
const processCheckIn = async () => {
  if (!scannedData.value) return

  try {
    isProcessing.value = true // Show loading logic if needed inside dialog

    if (selectedTargetId.value === 'main') {
        // Case 1: Check-in Event หลัก
        await registrationStore.checkInUser(scannedData.value.eventId, scannedData.value.userId)
        toast.success(`Check-in: ${scannedData.value.firstName} เรียบร้อย`)
        showDialog.value = false 
    } else {
        // Case 2: Check-in Sub-session
        await registrationStore.checkInSession(
            scannedData.value.eventId, 
            scannedData.value.userId, 
            selectedTargetId.value
        )
        toast.success(`Check-in Session: ${scannedData.value.firstName} เรียบร้อย`)
        showDialog.value = false 
    }

  } catch (error: any) {
    console.error(error)
    showDialog.value = false // ปิด Dialog ปกติไปก่อน

    // [NEW] Handle 400 Bad Request: "User must check-in at the main event first."
    // ตรวจสอบทั้ง statusCode (ถ้ามี) หรือ message
    const isMainEventReqError = 
        error?.statusCode === 400 || 
        error?.message?.includes('check-in at the main event first') ||
        error?.response?.data?.message?.includes('check-in at the main event first') // กรณี axios error structure

    if (isMainEventReqError) {
        // เปิด Dialog ถาม Chain Check-in
        showChainCheckInDialog.value = true
    } else {
        // Error อื่นๆ
        toast.error('Check-in ล้มเหลว', {
            description: error?.message || 'กรุณาลองใหม่อีกครั้ง'
        })
    }
  } finally {
      // ถ้าไม่ได้เปิด Chain Dialog ให้ reset กล้อง
      if (!showChainCheckInDialog.value) {
         closeDialog() 
      }
      isProcessing.value = false
  }
}

// [NEW] Function สำหรับ Check-in ต่อเนื่อง (Main -> Session)
const processChainCheckIn = async () => {
    if (!scannedData.value) return
    isProcessing.value = true
    
    try {
        // 1. Check-in Main Event ก่อน
        await registrationStore.checkInUser(scannedData.value.eventId, scannedData.value.userId)
        toast.success('Check-in Event หลักเรียบร้อย กำลังดำเนินการต่อ...')

        // 2. Check-in Session ตามมาทันที
        await registrationStore.checkInSession(
            scannedData.value.eventId, 
            scannedData.value.userId, 
            selectedTargetId.value
        )
        toast.success(`Check-in Session: ${selectedTargetName.value} เรียบร้อย`)
        
        showChainCheckInDialog.value = false
    } catch (error: any) {
        toast.error('เกิดข้อผิดพลาดในการ Check-in ต่อเนื่อง', {
            description: error?.message
        })
    } finally {
        isProcessing.value = false
        closeDialog() // Reset กล้อง
    }
}

const closeDialog = (isOpen: boolean = false) => {
  if (!isOpen && !showChainCheckInDialog.value) { // เพิ่มเงื่อนไขไม่ให้ปิดถ้า Chain Dialog เปิดอยู่
    showDialog.value = false
    scannedData.value = null
    setTimeout(() => {
      isPaused.value = false
    }, 1000)
  }
}

const pauseCameraTemporary = () => {
    isPaused.value = true
    setTimeout(() => {
        isPaused.value = false
    }, 2000)
}

const onError = (error: Error) => {
  if (error.name === 'NotAllowedError') errorMsg.value = 'กรุณาอนุญาตให้เข้าถึงกล้อง'
  else if (error.name === 'NotFoundError') errorMsg.value = 'ไม่พบอุปกรณ์กล้อง'
  else errorMsg.value = `Error: ${error.message}`
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-4 text-center relative">
    <h2 class="text-2xl font-bold mb-4">Scan Check-in</h2>
    <div class="text-sm text-slate-500 mb-2">{{ currentEventName }}</div>

    <div class="mb-6 flex justify-center">
        <div class="w-full max-w-xs">
            <label class="block text-sm font-medium text-slate-700 mb-1 text-left">เลือกสิ่งที่ต้องการ Check-in</label>
            <select 
                v-model="selectedTargetId"
                class="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="main">Event หลัก (Main Event)</option>
                <optgroup v-if="sessions.length > 0" label="Sub-Sessions">
                    <option v-for="session in sessions" :key="session.id" :value="session.id">
                        Session: {{ session.name }}
                    </option>
                </optgroup>
            </select>
            </div>
    </div>
    
    <div v-if="errorMsg" class="mb-4 p-3 bg-red-100 text-red-600 rounded-md border border-red-200">
        {{ errorMsg }}
    </div>

    <div class="relative w-full aspect-square max-w-[400px] mx-auto overflow-hidden rounded-xl border-2 border-slate-200 bg-black shadow-md">
      <QrcodeStream 
        @detect="onDetect" 
        @error="onError"
        :paused="isPaused"
        :track="false"
      >
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none" v-if="!isPaused && !isProcessing">
           <div class="w-64 h-64 border-4 border-green-400/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
        </div>

        <div v-if="isProcessing" class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
            <Loader2 class="w-10 h-10 animate-spin mb-2" />
            <p>Processing...</p>
        </div>
      </QrcodeStream>
    </div>

    <p class="mt-4 text-slate-500 text-sm">
        กำลัง Scan เพื่อ: <span class="font-bold text-blue-600">{{ selectedTargetName }}</span>
    </p>

    <Dialog :open="showDialog" @update:open="(val) => !val && closeDialog()">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ยืนยัน Check-in</DialogTitle>
          <DialogDescription>
            ตรวจสอบข้อมูลและเป้าหมายการ Check-in
          </DialogDescription>
        </DialogHeader>
        
        <div class="bg-slate-50 p-4 rounded-lg space-y-3" v-if="scannedData">
          <div class="text-center pb-2 border-b border-slate-200 font-semibold text-blue-600">
             {{ selectedTargetName }}
          </div>
          <div class="grid grid-cols-3 gap-2 text-sm pt-2">
            <span class="text-slate-500 text-right">ชื่อ-สกุล:</span>
            <span class="col-span-2 font-medium text-slate-900">
                {{ scannedData.firstName }} {{ scannedData.lastName }}
            </span>
            <span class="text-slate-500 text-right">ID:</span>
            <span class="col-span-2 font-mono text-slate-700">{{ scannedData.userId }}</span>
          </div>
        </div>

        <DialogFooter class="flex flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" @click="closeDialog()" class="w-full sm:w-auto">
            ยกเลิก
          </Button>
          <Button @click="processCheckIn" class="w-full sm:w-auto bg-green-600 hover:bg-green-700">
            ยืนยัน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showChainCheckInDialog" @update:open="(val) => !val && (showChainCheckInDialog = false, closeDialog())">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle class="text-amber-600 flex items-center gap-2">
                     แจ้งเตือน
                </DialogTitle>
                <DialogDescription>
                    ผู้เข้าร่วมยังไม่ได้ Check-in Event หลัก
                </DialogDescription>
            </DialogHeader>
            <div class="py-4">
                <p>ระบบตรวจสอบพบว่า <strong>{{ scannedData?.firstName }}</strong> ยังไม่ได้เข้างานหลัก</p>
                <p class="mt-2 text-slate-600">ต้องการ Check-in <strong>Event หลัก</strong> พร้อมกับ <strong>{{ selectedTargetName }}</strong> เลยหรือไม่?</p>
            </div>
            <DialogFooter class="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" @click="showChainCheckInDialog = false; closeDialog()">
                    ยกเลิก
                </Button>
                <Button @click="processChainCheckIn" class="bg-amber-600 hover:bg-amber-700 text-white">
                    ยืนยัน Check-in ทั้งหมด
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  </div>
</template>