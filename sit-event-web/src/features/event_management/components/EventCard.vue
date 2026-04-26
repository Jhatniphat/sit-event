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
  hasRegister: string // '' | 'PARTICIPANT' | 'STAFF'
}

const props = defineProps<{
  event: EventItem
}>()

const emit = defineEmits<{
  (e: 'register', payload: { id: string; canRegisterAtStaff: boolean; canRegisterAtParticipant: boolean }): void
  (e: 'unregister', payload: { id: string; role: string }): void
  (e: 'click', id: string): void
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
    day: 'numeric', month: 'short', year: 'numeric' 
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

const buttonText = computed(() => {
  return 'ไปดูรายละเอียด'
})

const isButtonDisabled = computed(() => {
  return false 
})

const buttonVariant = computed(() => {
  return 'default' as const
})

const handleButtonClick = () => {
  emit('click', props.event.id)
}
</script>

<template>
  <Card 
    class="w-full max-w-sm overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
    @click="emit('click', event.id)"
  >
    <div class="relative w-full h-48 overflow-hidden">
      <img 
        :src="event.thumbnail" 
        :alt="event.name" 
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
         <Badge v-if="event.hasRegister" class="bg-green-600 hover:bg-green-700">
          ลงทะเบียนแล้ว ({{ event.hasRegister }})
        </Badge>
        <Badge 
          v-else-if="daysRemaining > 0" 
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
      <CardTitle class="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors event-card-event-name" :title="event.name">
        {{ event.name }}
      </CardTitle>
      
      <div class="flex items-center text-sm text-muted-foreground mt-1">
        <CalendarDays class="w-4 h-4 mr-1" />
        <span>{{ formattedDateRange }}</span>
      </div>
    </CardHeader>

    <CardContent class="flex-grow">
      <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
        {{ truncatedDescription }}
      </p>
    </CardContent>

    <CardFooter class="pt-2">
      <Button 
        class="w-full" 
        :variant="buttonVariant"
        :disabled="isButtonDisabled"
        @click.stop="handleButtonClick"
      >
        {{ buttonText }}
      </Button>
    </CardFooter>
  </Card>
</template>