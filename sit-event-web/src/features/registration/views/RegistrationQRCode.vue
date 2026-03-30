<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  }
})

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
          </div>
        </div>
      </CardContent>
      
      <CardFooter class="justify-center text-xs text-slate-400">
        Code: {{ eventId?.slice(0, 8) }}...
      </CardFooter>
    </Card>
  </div>
</template>