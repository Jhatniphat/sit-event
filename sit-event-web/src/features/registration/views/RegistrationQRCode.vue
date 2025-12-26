<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io, Socket } from 'socket.io-client'
import QrcodeVue from 'qrcode.vue'
import { toast } from 'vue-sonner' // หรือ useToast จาก shadcn

// --- Stores ---
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useEventStore } from '@/features/event_management/store/EventStore'

// --- Components (Shadcn) ---
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const eventStore = useEventStore()

// --- State ---
const eventId = computed(() => route.params.id as string)
const eventName = ref<string>('Loading Event...')
const socket = ref<Socket | null>(null)
const isConnected = ref(false)

// --- Lifecycle ---
onMounted(async () => {
  if (!authStore.isAuthenticated) {
    toast.error('กรุณาเข้าสู่ระบบก่อน')
    router.push({ name: 'Login' })
    return
  }

  if (eventId.value) {
    // 1. Fetch Event Name
    try {
      // สมมติว่าใน store มี action getEventById
      const event = await eventStore.getEventById(eventId.value)
      eventName.value = event?.name || 'Unknown Event'
    } catch (error) {
      console.error('Failed to fetch event name', error)
      eventName.value = 'Event info not found'
    }

    // 2. Setup WebSocket
    setupSocket()
  }
})

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect()
  }
})

// --- Socket Logic ---
const setupSocket = () => {
  // เชื่อมต่อ Namespace หรือ Root ตาม Backend Config
  // ควรอ่านจาก ENV: import.meta.env.VITE_API_URL
  socket.value = io(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}`, {
    transports: ['websocket'],
    query: {
      userId: authStore.user?.id,
      eventId: eventId.value
    }
  })

  socket.value.on('connect', () => {
    isConnected.value = true
    console.log('Socket Connected:', socket.value?.id)
    
    // ส่ง Event บอก Backend ว่า "ฉันเปิดหน้า QR แล้วนะ"
    // Backend จะเอา socketId ไปเก็บไว้ใน room: `event-${eventId}-user-${userId}`
    socket.value?.emit('join-qr-session', {
      eventId: eventId.value,
      userId: authStore.user?.id
    })
  })

  socket.value.on('disconnect', () => {
    isConnected.value = false
  })

  // 3. รอรับ Event เมื่อ Staff สแกนและกดยืนยันสำเร็จ
  socket.value.on('check-in-complete', (data: any) => {
    
    // สร้าง Promise ที่จะทำงานเสร็จใน 3 วินาที
    const redirectPromise = new Promise((resolve) => setTimeout(resolve, 3000));

    toast.promise(redirectPromise, {
      // 1. ข้อความที่จะแสดงระหว่างรอ 3 วินาที
      loading: 'Check-in สำเร็จ! กำลังกลับไปหน้ากิจกรรม...', 
      
      // 2. เมื่อครบ 3 วินาที (Promise resolve)
      success: () => {
        router.push({ name: 'EventDetail', params: { id: eventId.value } });
        return `ยินดีต้อนรับเข้าสู่ ${eventName.value}`;
      },
      
      // 3. กรณี Promise reject (ไม่น่าจะเกิดขึ้นในที่นี้)
      error: 'เกิดข้อผิดพลาดในการเปลี่ยนหน้า',
    });

  })
}

// --- Computed ---
const qrCodeValue = computed(() => {
  if (!eventId.value || !authStore.user) return ''
  // Format: eventid_userid_firstname_lastname
  return `${eventId.value}_${authStore.user.id}_${authStore.user.firstName}_${authStore.user.lastName}`
})
</script>

<template>
  <div class="flex items-center justify-center min-h-[80vh] p-4 bg-slate-50">
    <Card class="w-full max-w-md shadow-lg">
      <CardHeader class="text-center">
        <CardTitle class="text-2xl font-bold text-primary">Your Ticket</CardTitle>
        <CardDescription>แสดง QR Code นี้ให้เจ้าหน้าที่เพื่อเข้าร่วมงาน</CardDescription>
      </CardHeader>
      
      <CardContent class="flex flex-col items-center gap-6">
        <div 
          class="p-4 bg-white rounded-xl border-2 border-dashed border-slate-300 shadow-sm transition-all duration-300"
          :class="{ 'border-green-500 shadow-green-100': isConnected }"
        >
          <qrcode-vue
            v-if="qrCodeValue"
            :value="qrCodeValue"
            :size="250"
            level="H"
            render-as="svg"
            background="#ffffff"
            foreground="#000000"
          />
          <div v-else class="h-[250px] w-[250px] flex items-center justify-center text-red-500">
            ไม่พบข้อมูล
          </div>
        </div>

        <div class="w-full space-y-2 text-center">
           <h3 class="text-xl font-semibold text-slate-800">{{ eventName }}</h3>
          
          <Separator />
          
          <div class="text-sm text-slate-500 py-2">
            <p v-if="authStore.user" class="font-medium">
              {{ authStore.user.firstName }} {{ authStore.user.lastName }}
            </p>
            <p v-if="isConnected" class="text-green-600 text-xs mt-1 flex items-center justify-center gap-1">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Ready to Scan
            </p>
            <p v-else class="text-amber-500 text-xs mt-1">Connecting to server...</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter class="justify-center text-xs text-slate-400">
        Code: {{ eventId.value?.slice(0, 8) }}...
      </CardFooter>
    </Card>
  </div>
</template>