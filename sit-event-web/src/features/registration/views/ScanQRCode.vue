<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { QrcodeStream } from 'vue-qrcode-reader'
import { useRegistrationStore } from '@/features/registration/store/RegistrationStore'
import { toast } from 'vue-sonner'
import { Loader2 } from 'lucide-vue-next' // แนะนำให้ลง lucide-vue-next สำหรับ icon

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
const eventIdFromRoute = route.params.id as string

const scannedData = ref<ScannedUser | null>(null)
const showDialog = ref(false)
const isPaused = ref(false)
const isProcessing = ref(false) // loading state ขณะเช็คกับ backend
const errorMsg = ref('')

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

  if (parsedObj.eventId !== eventIdFromRoute) {
    toast.error('QR Code นี้ไม่ใช่ของกิจกรรมนี้', {
        description: `QR Event: ${parsedObj.eventId}`
    })
    pauseCameraTemporary()
    return
  }

  // หยุดกล้องก่อนเริ่ม process
  isPaused.value = true
  isProcessing.value = true

  try {
    // [Requirement 1] Backend เช็คว่า participant เปิด QR code อยู่จริงไหม
    // สมมติเรียกผ่าน Store action: checkUserActiveStatus(eventId, userId)
    // ซึ่งจะยิงไป path :eventId/open-qr/:userId (GET) เพื่อเช็ค socket status
    
    // const isActive = await registrationStore.checkUserActiveStatus(parsedObj.eventId, parsedObj.userId)
    
    // *เนื่องจากยังไม่มี backend จริง ขอ mock เป็น true ไว้ก่อน*
    const isActive = true 

    if (!isActive) {
        toast.warning('ผู้เข้าร่วมไม่ได้เปิดหน้า QR Code อยู่', {
            description: 'กรุณาให้ผู้เข้าร่วมเปิดหน้า QR Code ค้างไว้'
        })
        closeDialog() // reset กล้อง
    } else {
        // ข้อมูลถูกต้อง + User online -> เปิด Dialog ยืนยัน
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

const processCheckIn = async () => {
  if (!scannedData.value) return

  try {
    // [Requirement 2] กดยืนยัน -> Backend บันทึก -> Backend ส่ง Socket แจ้ง Participant
    await registrationStore.checkInUser(scannedData.value.eventId, scannedData.value.userId)
    
    toast.success(`Check-in: ${scannedData.value.firstName} สำเร็จ`)
    showDialog.value = false // ปิด Dialog
    // กล้องจะถูก reset ใน watch หรือ function closeDialog
  } catch (error) {
    console.error(error)
    toast.error('Check-in ล้มเหลว', {
        description: 'กรุณาลองใหม่อีกครั้ง'
    })
  } finally {
     closeDialog()
  }
}

const closeDialog = (isOpen: boolean = false) => {
  if (!isOpen) {
    showDialog.value = false
    scannedData.value = null
    // หน่วงเวลาเล็กน้อยก่อนเปิดกล้องใหม่
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
  if (error.name === 'NotAllowedError') {
    errorMsg.value = 'กรุณาอนุญาตให้เข้าถึงกล้อง'
  } else if (error.name === 'NotFoundError') {
    errorMsg.value = 'ไม่พบอุปกรณ์กล้อง'
  } else {
    errorMsg.value = `Error: ${error.message}`
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-4 text-center relative">
    <h2 class="text-2xl font-bold mb-4">Scan Check-in</h2>
    
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
            <p>Verifying...</p>
        </div>
      </QrcodeStream>
    </div>

    <p class="mt-4 text-slate-500 text-sm">
        ถือกล้องให้นิ่งและให้ QR Code อยู่ในกรอบ
    </p>

    <Dialog :open="showDialog" @update:open="closeDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ยืนยันตัวตนผู้เข้าร่วม</DialogTitle>
          <DialogDescription>
            ตรวจสอบข้อมูลก่อนทำการ Check-in
          </DialogDescription>
        </DialogHeader>
        
        <div class="bg-slate-50 p-4 rounded-lg space-y-3" v-if="scannedData">
          <div class="grid grid-cols-3 gap-2 text-sm">
            <span class="text-slate-500 text-right">ชื่อ-สกุล:</span>
            <span class="col-span-2 font-medium text-slate-900">
                {{ scannedData.firstName }} {{ scannedData.lastName }}
            </span>
            
            <span class="text-slate-500 text-right">ID:</span>
            <span class="col-span-2 font-mono text-slate-700">{{ scannedData.userId }}</span>
          </div>
        </div>

        <DialogFooter class="flex flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" @click="closeDialog(false)" class="w-full sm:w-auto">
            ยกเลิก
          </Button>
          <Button @click="processCheckIn" class="w-full sm:w-auto bg-green-600 hover:bg-green-700">
            ยืนยัน Check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>