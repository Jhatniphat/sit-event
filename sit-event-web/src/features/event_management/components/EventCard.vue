<script setup lang="ts">
import { computed } from 'vue'
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarDays } from 'lucide-vue-next'

export interface EventItem {
  id: string
  name: string
  description: string
  thumbnail: string
  eventStartDate: string | Date
  eventEndDate: string | Date
  registrationEndDate: string | Date
  canRegisterAtStaff: boolean
  canRegisterAtParticipant: boolean
}

const props = defineProps<{
  event: EventItem
}>()

const emit = defineEmits<{
  (e: 'register', payload: { id: string; canRegisterAtStaff: boolean; canRegisterAtParticipant: boolean }): void
}>()

const daysRemaining = computed(() => {
  const now = new Date()
  const regEnd = new Date(props.event.registrationEndDate)
  const diffTime = regEnd.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

const formattedDateRange = computed(() => {
  const start = new Date(props.event.eventStartDate)
  const end = new Date(props.event.eventEndDate)
  
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  }
  
  const startDateStr = start.toLocaleDateString('th-TH', options)
  const endDateStr = end.toLocaleDateString('th-TH', options)

  if (startDateStr === endDateStr) {
    return startDateStr
  }
  return `${startDateStr} - ${endDateStr}`
})

const truncatedDescription = computed(() => {
  const limit = 100
  if (props.event.description.length <= limit) return props.event.description
  return props.event.description.substring(0, limit) + '...'
})

// 2. Logic สำหรับข้อความบนปุ่ม
const buttonText = computed(() => {
  if (daysRemaining.value <= 0) {
    return 'ปิดรับสมัครแล้ว'
  }
  // ถ้ามีสิทธิ์อย่างใดอย่างหนึ่ง
  if (props.event.canRegisterAtStaff || props.event.canRegisterAtParticipant) {
    return 'ลงทะเบียนเข้าร่วม'
  }
  // เวลายังเหลือ แต่ไม่มีสิทธิ์
  return 'ไม่สามารถลงทะเบียนได้'
})

// 3. Logic สำหรับสถานะ Disable ของปุ่ม
const isButtonDisabled = computed(() => {
  // หมดเวลา หรือ (ไม่มีสิทธิ์ Staff และ ไม่มีสิทธิ์ Participant)
  return daysRemaining.value <= 0 || (!props.event.canRegisterAtStaff && !props.event.canRegisterAtParticipant)
})

// ฟังก์ชันสำหรับส่งค่าเมื่อกดปุ่ม
const handleRegisterClick = () => {
  emit('register', {
    id: props.event.id,
    canRegisterAtStaff: props.event.canRegisterAtStaff,
    canRegisterAtParticipant: props.event.canRegisterAtParticipant
  })
}
</script>

<template>
  <Card class="w-full max-w-sm overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
    <div class="relative w-full h-48">
      <img 
        :src="event.thumbnail" 
        :alt="event.name" 
        class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
      />
      <div class="absolute top-2 right-2">
        <Badge 
          v-if="daysRemaining > 0" 
          :variant="daysRemaining <= 3 ? 'destructive' : 'secondary'"
        >
          เหลือเวลา {{ daysRemaining }} วัน
        </Badge>
        <Badge v-else variant="destructive">
          ปิดรับสมัคร
        </Badge>
      </div>
    </div>

    <CardHeader class="pb-2">
      <CardTitle class="text-xl font-bold line-clamp-1" :title="event.name">
        {{ event.name }}
      </CardTitle>
      
      <div class="flex items-center text-sm text-muted-foreground mt-1">
        <CalendarDays class="w-4 h-4 mr-1" />
        <span>{{ formattedDateRange }}</span>
      </div>
    </CardHeader>

    <CardContent class="flex-grow">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        {{ truncatedDescription }}
      </p>
    </CardContent>

    <CardFooter class="pt-2">
      <Button 
        class="w-full" 
        :disabled="isButtonDisabled"
        @click="handleRegisterClick"
      >
        {{ buttonText }}
      </Button>
    </CardFooter>
  </Card>
</template>