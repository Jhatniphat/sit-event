<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

onMounted(async () => {
  const code = route.query.code as string

  if (code) {
    try {
      await authStore.handleLoginCallback(code)
      await authStore.checkSession()
      router.push('/')
    } catch (error) {
      console.error('Authentication failed:', error)
      toast.error('Authentication failed. Please try logging in again.')
      router.push('/')
    }
  } else {
    // กรณีไม่มี Code ให้กลับไปหน้าแรกทันที
    router.push('/')
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
          กำลังเข้าสู่ระบบ
        </h1>
        <p class="text-sm text-muted-foreground">
          กรุณารอสักครู่ ระบบกำลังตรวจสอบข้อมูลและยืนยันตัวตนของคุณ
        </p>
      </div>
      
    </div>
  </div>
</template>