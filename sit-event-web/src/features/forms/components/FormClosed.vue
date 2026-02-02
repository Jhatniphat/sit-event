<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'

const router = useRouter()

const goHome = () => {
  router.push({ name: 'Home' })
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6 space-y-5 bg-slate-50/30 min-h-screen">
    <div class="border-t-5 rounded-lg border-t-black shadow-sm">
      <div class="p-10">
        <div class="text-black text-3xl font-bold">ตอนนี้แบบฟอร์มปิดรับคำตอบแล้ว</div>
        <p class="text-black mt-2 text-md">ขอบคุณที่ให้ความสนใจในกิจกรรมของเรา</p>
      </div>
    </div>
    <div class="flex justify-between items-center pt-2">
      <div class="flex gap-4">
        <Button variant="outline" @click="router.back()"> ย้อนกลับ </Button>
        <Button @click="goHome"> กลับสู่หน้าหลัก </Button>
      </div>
    </div>
  </div>
</template>
