<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store' // path ไปยัง store ของคุณ
import QrcodeVue from 'qrcode.vue'

// เรียกใช้ Hooks
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 1. ดึง Event ID จาก Route Params
const eventId = computed(() => route.params.id as string)

// 2. สร้าง String ข้อมูลสำหรับ QR Code ตาม Format: eventid_userid_firstname_lastname
const qrCodeValue = computed(() => {
  if (!eventId.value || !authStore.isAuthenticated) return ''
  
  // Format: eventid_userid_firstname_lastname
  return `${eventId.value}_${authStore.user?.id}_${authStore.user?.firstName}_${authStore.user?.lastName}`
})

// (Optional) ตรวจสอบว่าถ้าไม่มี user ให้เด้งไปหน้า login หรือหน้าอื่น
onMounted(() => {
  if (!authStore.isAuthenticated) {
    alert('กรุณาเข้าสู่ระบบก่อน')
    // router.push('/login') 
  }
})
</script>

<template>
  <div class="qr-container">
    <div class="card">
      <h1>Your Event Ticket</h1>
      <p class="subtitle">กรุณาแสดง QR Code นี้เพื่อเข้าร่วมงาน</p>

      <div class="qr-wrapper" v-if="qrCodeValue">
        <qrcode-vue 
          :value="qrCodeValue" 
          :size="250" 
          level="H" 
          render-as="svg"
          background="#ffffff"
          foreground="#000000"
        />
      </div>

      <div v-else class="error-msg">
        <p>ไม่พบข้อมูลผู้ใช้ หรือ รหัสกิจกรรม</p>
      </div>

      <div class="info-display" v-if="authStore.isAuthenticated">
        <p><strong>Event ID:</strong> {{ eventId }}</p>
        <p><strong>Name:</strong> {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}</p>
      </div>
      
      <p class="debug-text">Data: {{ qrCodeValue }}</p>
    </div>
  </div>
</template>

<style scoped>
.qr-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 20px;
}

.card {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
  width: 100%;
  color: #333;
}

h1 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.qr-wrapper {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  display: inline-block;
  margin-bottom: 1.5rem;
  border: 2px dashed #dee2e6;
}

.info-display {
  text-align: left;
  background: #f1f3f5;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.info-display p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.debug-text {
  margin-top: 1rem;
  font-size: 0.7rem;
  color: #aaa;
  word-break: break-all;
}

.error-msg {
  color: red;
}
</style>