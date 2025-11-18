import { defineStore } from 'pinia'

// 1. นิยาม interface สำหรับ Toast แต่ละอัน
interface Toast {
  id: number
  text: string
  status: 'success' | 'error' | 'info' | 'warning'
  time: number
}

// 2. สร้าง store
export const useToastStore = defineStore('toast', {
  // 3. State ใช้เก็บรายการ Toast ทั้งหมด
  state: () => ({
    toasts: [] as Toast[], // เป็น array ของ Toast
  }),

  actions: {
    // 4. Action สำหรับแสดง Toast (นี่คือฟังก์ชันที่คุณจะเรียกใช้)
    showToast(text: string, status: Toast['status'] = 'info', time: number = 3000) {
      // สร้าง ID ที่ไม่ซ้ำกัน (ใช้ timestamp ปัจจุบัน)
      const id = Date.now()

      // เพิ่ม Toast เข้าไปใน array
      this.toasts.push({
        id,
        text,
        status,
        time,
      })

      // 5. ตั้งเวลาให้ Toast หายไปเอง
      setTimeout(() => {
        this.removeToast(id)
      }, time)
    },

    // 6. Action สำหรับลบ Toast (ใช้ภายใน)
    removeToast(id: number) {
      this.toasts = this.toasts.filter((toast) => toast.id !== id)
    },
  },
})