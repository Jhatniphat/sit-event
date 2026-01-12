<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { type EventSession } from '@/features/event_management/services/EventServices'
import { Check } from 'lucide-vue-next' // เพิ่ม icon สำหรับ Checkbox

const props = defineProps<{
  open: boolean
  sessions: EventSession[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', sessionIds: string[]): void // เปลี่ยน return type เป็น array
  (e: 'back'): void
}>()

const selectedSessionIds = ref<string[]>([])

// Logic เรียงลำดับข้อมูล: เวลาเริ่มก่อน -> เวลาจบก่อน
const sortedSessions = computed(() => {
  return [...props.sessions].sort((a, b) => {
    const startA = new Date(a.startTime).getTime()
    const startB = new Date(b.startTime).getTime()
    if (startA !== startB) {
      return startA - startB
    }
    const endA = new Date(a.endTime).getTime()
    const endB = new Date(b.endTime).getTime()
    return endA - endB
  })
})

// Reset selection when dialog opens/closes
watch(() => props.open, (newVal) => {
  if (!newVal) selectedSessionIds.value = []
})

// Toggle selection
const toggleSelection = (id: string) => {
  const index = selectedSessionIds.value.indexOf(id)
  if (index === -1) {
    selectedSessionIds.value.push(id)
  } else {
    selectedSessionIds.value.splice(index, 1)
  }
}

const handleConfirm = () => {
  if (selectedSessionIds.value.length > 0) {
    emit('confirm', selectedSessionIds.value)
  }
}

// Helper จัดรูปแบบเวลา
const formatTimeRange = (start: string, end: string) => {
  const startTime = new Date(start).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const endTime = new Date(end).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const date = new Date(start).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  return `${date} | ${startTime} - ${endTime}`
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[600px] max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>เลือกรอบกิจกรรม (Sub-sessions)</DialogTitle>
        <DialogDescription>
          กิจกรรมนี้มีหลายรอบ คุณสามารถเลือกได้หลายรายการ
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
        <div v-if="isLoading" class="flex justify-center py-8">
          <span class="loading loading-spinner text-primary">Loading sessions...</span>
        </div>

        <div v-else-if="sortedSessions.length === 0" class="text-center py-8 text-muted-foreground">
          ไม่พบข้อมูลรอบกิจกรรม
        </div>

        <div
          v-else
          v-for="session in sortedSessions"
          :key="session.id"
          class="relative flex items-start space-x-4 rounded-xl border p-4 cursor-pointer transition-all hover:bg-accent/50 select-none"
          :class="selectedSessionIds.includes(session.id) ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'"
          @click="toggleSelection(session.id)"
        >
          <div class="mt-1">
            <div 
              class="h-5 w-5 rounded border flex items-center justify-center transition-colors duration-200"
              :class="selectedSessionIds.includes(session.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground bg-transparent'"
            >
              <Check v-if="selectedSessionIds.includes(session.id)" class="h-3.5 w-3.5" />
            </div>
          </div>

          <div class="flex-1 space-y-1">
            <div class="flex justify-between items-start">
              <p class="text-sm font-medium leading-none">{{ session.name }}</p>
              <span class="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                {{ session.location }}
              </span>
            </div>
            
            <p class="text-xs text-primary font-medium">
              🕒 {{ formatTimeRange(session.startTime, session.endTime) }}
            </p>

            <p class="text-xs text-muted-foreground line-clamp-2">
              {{ session.description }}
            </p>
            
            <div class="pt-2 flex gap-3 text-xs text-muted-foreground">
              <span>🪑 ที่นั่ง: {{ session.maxSeats }}</span>
              <span v-if="session.pointsAwarded > 0">⭐ คะแนน: {{ session.pointsAwarded }}</span>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="flex flex-col-reverse sm:flex-row gap-2 mt-auto pt-2">
        <Button variant="outline" @click="emit('back')">
          ย้อนกลับ
        </Button>
        <Button 
          type="button" 
          @click="handleConfirm" 
          :disabled="selectedSessionIds.length === 0 || isLoading"
        >
          ยืนยันการลงทะเบียน ({{ selectedSessionIds.length }})
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>