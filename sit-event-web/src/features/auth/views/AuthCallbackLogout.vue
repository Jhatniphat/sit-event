<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useRegistrationStore } from '@/features/registration/store/RegistrationStore'
import { Loader2 } from 'lucide-vue-next'

const authStore = useAuthStore()
const registrationStore = useRegistrationStore()
const router = useRouter()

onMounted(async () => {
  try {
    // 1. รอให้กระบวนการ Logout และเคลียร์ Auth Token เสร็จสิ้น
    await authStore.handleLogoutCallback()

    // 2. ล้างข้อมูลที่ค้างอยู่ใน Registration Store (กลับไปเป็นค่าเริ่มต้น)
    registrationStore.$reset()
    
    console.log('Cleared Registration Store data')
  } catch (error) {
    console.error('Logout process error:', error)
  } finally {
    // 3. เปลี่ยนหน้าไปที่ Home
    router.replace({ path: '/' })
    console.log('Auth Callback Logout Mounted')
  }
})
</script>

<template>
  <div class="flex min-h-screen w-full items-center justify-center bg-background px-4">
    <div class="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm">
      
      <div class="flex justify-center">
        <Loader2 class="h-12 w-12 animate-spin text-primary" />
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight">
          กำลังออกจากระบบ
        </h1>
        <p class="text-sm text-muted-foreground">
          กรุณารอสักครู่ ระบบกำลังดำเนินการออกจากระบบของคุณ
        </p>
      </div>
      
    </div>
  </div>
</template>