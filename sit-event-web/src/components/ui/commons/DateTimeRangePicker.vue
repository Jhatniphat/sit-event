<script setup lang="ts">
import { computed } from 'vue'
import { Label } from '@/components/ui/label'

const props = defineProps<{
  start: Date | undefined
  end: Date | undefined
  startLabel?: string
  endLabel?: string
  error?: string
}>()

const emit = defineEmits<{
  (e: 'update:start', value: Date): void
  (e: 'update:end', value: Date): void
}>()

const toDateTimeLocal = (date?: Date) => {
  if (!date || isNaN(date.getTime())) return ''
  const pad = (num: number) => num.toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const handleStartChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.value) {
    emit('update:start', new Date(target.value))
  }
}

const handleEndChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.value) {
    emit('update:end', new Date(target.value))
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2 w-full">
      <div class="flex-1 relative">
        <label v-if="startLabel" class="text-xs text-gray-500 absolute -top-2 left-2 bg-white px-1 z-10">{{ startLabel }}</label>
        <div class="flex items-center border rounded-md px-3 h-10 w-full focus-within:ring-2 focus-within:border-blue-500 bg-white"
             :class="{'border-red-500 focus-within:ring-red-200': error, 'border-gray-300 focus-within:ring-blue-100': !error}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 mr-2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <input 
            type="datetime-local" 
            class="flex-1 w-full text-sm outline-none bg-transparent"
            :value="toDateTimeLocal(start)"
            @change="handleStartChange"
          />
        </div>
      </div>
      
      <span class="text-gray-400 mx-1">
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </span>

      <div class="flex-1 relative">
        <label v-if="endLabel" class="text-xs text-gray-500 absolute -top-2 left-2 bg-white px-1 z-10">{{ endLabel }}</label>
        <div class="flex items-center border rounded-md px-3 h-10 w-full focus-within:ring-2 focus-within:border-blue-500 bg-white"
             :class="{'border-red-500 focus-within:ring-red-200': error, 'border-gray-300 focus-within:ring-blue-100': !error}">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 mr-2"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/><path d="m16 2 5 5-5 5"/><path d="M21 7H8"/></svg>
          <input 
            type="datetime-local" 
            class="flex-1 w-full text-sm outline-none bg-transparent"
            :value="toDateTimeLocal(end)"
            @change="handleEndChange"
          />
        </div>
      </div>
    </div>
    <span v-if="error" class="text-[0.8rem] font-medium text-destructive mt-1">{{ error }}</span>
  </div>
</template>
