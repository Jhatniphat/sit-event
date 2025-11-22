<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { QrcodeStream } from 'vue-qrcode-reader'
import { useRegistrationStore } from '@/features/registration/store/RegistrationStore'

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
const eventIdFromRoute = route.params.id as string // รับ eventId จาก Route

const scannedData = ref<ScannedUser | null>(null)
const showModal = ref(false)
const isPaused = ref(false) // ใช้สำหรับหยุดกล้องชั่วคราวเมื่อเจอ QR Code
const errorMsg = ref('')

// --- Functions ---

/**
 * ฟังก์ชันสำหรับ Parse String จาก QR Code
 * Format: eventid_userid_firstname_lastname
 */
const parseQRData = (content: string): ScannedUser | null => {
  const parts = content.split('_')

  console.log('Parsed QR Parts:', parts)
  
  // ตรวจสอบความถูกต้องเบื้องต้น
  if (parts.length !== 4) {
    console.error('Invalid QR Format:', content)
    return null
  }

  // Cast เป็น Tuple [string, string, string, string]
  const [eventId, userId, firstName, lastName] = parts as [string, string, string, string]

  const data: ScannedUser = {
    eventId,
    userId,
    firstName,
    lastName
  }

  return data
}

/**
 * Event เมื่อกล้องตรวจจับ QR Code ได้
 */
const onDetect = (detectedCodes: DetectedBarcode[]) => {
  // ถ้ามี Modal เปิดอยู่ หรือหยุดกล้องอยู่ ไม่ต้องทำอะไร
  if (isPaused.value || detectedCodes.length === 0) return

  const result = detectedCodes[0]!.rawValue
  
  if (result) {
    // 1. แกะค่าออกมาเป็น Object
    const parsedObj = parseQRData(result)

    if (parsedObj) {
      // ตรวจสอบว่า Event ID ใน QR ตรงกับ Event ที่กำลังเปิดอยู่หรือไม่ (Optional)
      if (parsedObj.eventId !== eventIdFromRoute) {
        alert(`QR Code นี้สำหรับ Event ID: ${parsedObj.eventId} ซึ่งไม่ตรงกับหน้าปัจจุบัน`)
        return
      }

      // 2. Console log object
      console.log('Scanned Object:', parsedObj)

      // 3. อัปเดต State และเปิด Popup
      scannedData.value = parsedObj
      isPaused.value = true // หยุดการอ่านซ้ำ
      showModal.value = true
    }
  }
}

/**
 * ฟังก์ชันที่เตรียมไว้ (Placeholder)
 * เรียกเมื่อกดปุ่ม ยืนยัน หรือ ไม่ใช่
 */
const processCheckIn = async (confirmed: boolean) => {
  console.log(`Action Triggered. Confirmed: ${confirmed}`)
  
  if (confirmed && scannedData.value) {
    // TODO: ใส่ Logic เรียก API ไปยัง NestJS ที่นี่
    // เช่น await axios.post('/api/checkin', { ...scannedData.value })
    await useRegistrationStore().checkInUser(scannedData.value.eventId, scannedData.value.userId)
    console.log('Sending data to Backend...')
  } else {
    console.log('Cancelled check-in')
  }

  // ปิด Modal และเริ่มอ่านค่าใหม่
  closeModal()
}

const closeModal = () => {
  showModal.value = false
  scannedData.value = null
  
  // หน่วงเวลาเล็กน้อยก่อนเริ่มอ่านใหม่ เพื่อกันอ่านซ้ำทันทีที่ปิด
  setTimeout(() => {
    isPaused.value = false
  }, 500)
}

// Handle Camera Errors
const onError = (error: Error) => {
  if (error.name === 'NotAllowedError') {
    errorMsg.value = 'กรุณาอนุญาตให้เข้าถึงกล้อง'
  } else if (error.name === 'NotFoundError') {
    errorMsg.value = 'ไม่พบอุปกรณ์กล้องในเครื่องนี้'
  } else {
    errorMsg.value = `เกิดข้อผิดพลาด: ${error.message}`
  }
}
</script>

<template>
  <div class="scanner-container">
    <h2>Scan QR Code for Event Check-in</h2>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <div class="camera-wrapper">
      <QrcodeStream 
        @detect="onDetect" 
        @error="onError"
        :paused="isPaused"
      >
        <div class="scan-overlay" v-if="!isPaused">
            <div class="scan-frame"></div>
        </div>
        <div v-else class="loading-overlay">
            Processing...
        </div>
      </QrcodeStream>
    </div>

    <div v-if="showModal" class="modal-backdrop">
      <div class="modal-content">
        <h3>ยืนยันตัวตนผู้เข้าร่วม</h3>
        
        <div class="user-info" v-if="scannedData">
          <p class="label">ชื่อ - นามสกุล:</p>
          <p class="name">{{ scannedData.firstName }} {{ scannedData.lastName }}</p>
          <p class="uid">Student/Staff ID: {{ scannedData.userId }}</p>
        </div>

        <div class="actions">
          <button class="btn-cancel" @click="processCheckIn(false)">ไม่ใช่ (Cancel)</button>
          <button class="btn-confirm" @click="processCheckIn(true)">ใช่ (Confirm)</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scanner-container {
  max-width: 600px;
  margin: 0 auto;
  text-align:center;
  position: relative;
}

.camera-wrapper {
  width: 100%;
  height: 400px; /* ปรับความสูงตามต้องการ */
  overflow: hidden;
  border-radius: 12px;
  border: 2px solid #ccc;
  position: relative;
  background-color: #000;
}

.error {
  color: red;
  font-weight: bold;
}

/* Overlay Frame Style */
.scan-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.scan-frame {
  width: 250px;
  height: 250px;
  border: 4px solid rgba(0, 255, 0, 0.6);
  border-radius: 16px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5); /* ทำให้รอบนอกมืดลง */
}

/* Modal Style */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  color: #333; /* กำหนดสีตัวอักษรให้ชัดเจนเนื่องจากพื้นหลัง default อาจเป็น dark mode */
}

.user-info {
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f3f4f6;
  border-radius: 8px;
}

.user-info .name {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2563eb;
  margin: 0.5rem 0;
}

.actions {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
}

.btn-confirm {
  background-color: #10b981; /* Green */
  color: white;
}

.btn-cancel {
  background-color: #ef4444; /* Red */
  color: white;
}
</style>