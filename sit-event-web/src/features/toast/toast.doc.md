# using in .vue
```vue
<script setup lang="ts">
import { useToastStore } from '@/stores/toastStore'

const toastStore = useToastStore()

function handleCreateEvent() {
  // ... สมมติว่าสร้าง Event สำเร็จ ...

  // นี่คือการเรียกใช้งาน Toast ตามที่คุณต้องการ
  toastStore.showToast('สร้าง event สำเร็จแล้ว', 'success')
}

function handleError() {
  // เรียกแบบระบุเวลา 5 วินาที
  toastStore.showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error', 5000)
}
</script>

<template>
  <button @click="handleCreateEvent">ทดสอบ Toast Success</button>
  <button @click="handleError">ทดสอบ Toast Error</button>
</template>
```

# using in .ts
```ts
import { useToastStore } from '@/stores/toastStore'
import axios from 'axios'

export const eventService = {
  async createEvent(eventData: any) {
    const toastStore = useToastStore() // 1. ดึง store มาใช้
    
    try {
      const response = await axios.post('/api/events', eventData)
      
      // 2. เรียกใช้ Toast เมื่อสำเร็จ
      toastStore.showToast('สร้าง event สำเร็จแล้ว', 'success')
      
      return response.data
    } catch (error) {
      // 3. เรียกใช้ Toast เมื่อพลาด
      toastStore.showToast('เกิดข้อผิดพลาด: ไม่สามารถสร้าง Event ได้', 'error')
      
      throw error
    }
  }
}
```