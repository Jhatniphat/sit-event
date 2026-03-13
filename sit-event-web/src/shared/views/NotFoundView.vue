<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button } from '@/components/ui/button' 

const router = useRouter()
const route = useRoute()

const errorTypeMap: Record<string, string> = {
  event: 'กิจกรรม',
  form: 'แบบสอบถาม',
  ticket: 'ตั๋วเข้าร่วมงาน',
}

const entityName = computed(() => {
  const errorQuery = route.query.error as string
  if (errorQuery && errorTypeMap[errorQuery]) {
    return errorTypeMap[errorQuery]
  }
  return 'หน้า'
})

const goHome = () => {
  router.push({ name: 'Home' })
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50/50 text-center px-6">
    <div class="relative mb-8">
      <h1 class="text-[150px] font-black text-gray-100 leading-none select-none">404</h1>
      <div class="absolute inset-0 flex items-center justify-center">
        <span class="text-2xl font-bold text-gray-800 bg-gray-50/50 px-4 py-1 rounded-md">
          Page Not Found
        </span>
      </div>
    </div>

    <h2 class="text-3xl font-bold text-gray-900 mb-2">
      ไม่พบ{{ entityName }}ที่คุณต้องการ
    </h2>
    <p class="text-gray-500 max-w-md mb-8">
      {{ entityName }}ที่คุณกำลังพยายามเข้าถึงอาจถูกย้าย ลบ หรือไม่มีอยู่จริงในระบบ
      กรุณาตรวจสอบ URL หรือกลับไปที่หน้าหลัก
    </p>

    <div class="flex gap-4">
      <Button variant="outline" @click="router.back()">
        ย้อนกลับ
      </Button>
      <Button @click="goHome">
        กลับสู่หน้าหลัก
      </Button>
    </div>
  </div>
</template>