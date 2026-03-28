<script setup lang="ts">
import { ref } from 'vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import DateTimeRangePicker from '@/components/ui/commons/DateTimeRangePicker.vue'
import { Loader2 } from 'lucide-vue-next'

interface SubSession {
  id: string
  isNew: boolean
  name: string
  description: string
  start: Date
  end: Date
  location: string
  maxSeats: number | null
  pointsAwarded: number
  autoRegister: boolean
  isExpanded: boolean
  thumbnail: File | null
  previewUrl: string | null
}

const props = defineProps<{
  modelValue: SubSession[]
  isSessionLoading: boolean
  eventMaxSeats?: number | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SubSession[]): void
  (e: 'removeSubSession', index: number): void
  (e: 'skip'): void
}>()

const isCreatingNode = ref(props.modelValue.length > 0)

const toggleCreate = () => {
    isCreatingNode.value = true
    if (props.modelValue.length === 0) {
        addSubSession()
    }
}

const addSubSession = () => {
  const newSession: SubSession = {
    id: crypto.randomUUID(),
    isNew: true, 
    name: '',
    description: '',
    start: new Date(),
    end: new Date(),
    location: '',
    maxSeats: null,  // optional – null means unlimited
    autoRegister: false,
    pointsAwarded: 0,
    thumbnail: null,
    previewUrl: null,
    isExpanded: true
  }
  emit('update:modelValue', [...props.modelValue, newSession])
}

const removeSubSession = (index: number) => {
  emit('removeSubSession', index)
  if (props.modelValue.length <= 1) {
     isCreatingNode.value = false
  }
}

const toggleExpandSession = (index: number) => {
   const updated = [...props.modelValue]
   const session = updated[index]
   if (session) {
     session.isExpanded = !session.isExpanded
     emit('update:modelValue', updated)
   }
}

const handleSessionImageSelect = (index: number, e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file && file.type.startsWith('image/')) {
    const updated = [...props.modelValue]
    const session = updated[index]
    if (session) {
      session.thumbnail = file
      session.previewUrl = URL.createObjectURL(file)
      emit('update:modelValue', updated)
    }
  }
}

const removeSessionImage = (index: number) => {
  const updated = [...props.modelValue]
  const session = updated[index]
  if (session) {
    session.thumbnail = null
    session.previewUrl = null
    emit('update:modelValue', updated)
  }
}

const handleSkip = () => {
   isCreatingNode.value = false
   emit('update:modelValue', [])
   emit('skip')
}

</script>

<template>
  <div class="space-y-6 text-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="mb-4">
       <h2 class="text-xl font-semibold text-gray-900">2. Sub-Sessions</h2>
       <p class="text-sm text-gray-500">Break down your event into multiple sessions or tracks.</p>
    </div>

    <!-- Ask User -->
    <div v-if="!isCreatingNode" class="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Do you want to add sub-sessions?</h3>
        <p class="text-sm text-gray-500 text-center max-w-md mb-6">Sub-sessions allow attendees to register for specific tracks or schedules within your main event. You can skip this if your event is just a single session.</p>
        
        <div class="flex items-center gap-4">
            <Button type="button" variant="outline" class="w-32" @click="handleSkip" id="skip-btn">No, Skip</Button>
            <Button type="button" class="w-32" @click="toggleCreate" id="add-btn">Yes, Add</Button>
        </div>
    </div>

    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-800">Session Details</h3>
        <Button type="button" variant="outline" size="sm" @click="addSubSession">
          + Add Session
        </Button>
      </div>
      
      <div v-if="props.isSessionLoading" class="flex justify-center items-center p-8 border border-dashed rounded-lg bg-gray-50">
          <Loader2 class="w-6 h-6 animate-spin text-gray-500" />
          <span class="ml-2 text-sm text-gray-500">Loading Sessions...</span>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="(session, index) in props.modelValue" 
          :key="session.id" 
          class="border rounded-lg bg-white shadow-sm overflow-hidden transition-all"
        >
          <div class="flex items-center justify-between p-4 bg-gray-50 border-b">
            <div class="flex items-center gap-2 font-medium text-gray-700">
                <span class="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs">
                  {{ index + 1 }}
                </span>
                <span>{{ session.name || 'New Session' }}</span>
                <span v-if="session.isNew" class="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">NEW</span>
            </div>
            <div class="flex items-center gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                class="h-8 w-8 text-gray-500 hover:text-gray-900"
                @click="toggleExpandSession(index)"
              >
                <svg v-if="session.isExpanded" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                class="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                @click="removeSubSession(index)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </Button>
            </div>
          </div>

          <div v-show="session.isExpanded" class="p-4 space-y-4">
            <div class="flex flex-col md:flex-row gap-6">
              <div class="w-full md:w-40 flex-shrink-0">
                  <Label class="text-xs text-gray-500 mb-2 block">Thumbnail</Label>
                  <div class="relative w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-pointer overflow-hidden group">
                      <input type="file" class="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" @change="(e) => handleSessionImageSelect(index, e)" />
                      
                      <div v-if="!session.previewUrl" class="text-center p-2">
                        <svg class="mx-auto h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        <span class="text-[10px] text-gray-500 mt-1 block">Upload</span>
                      </div>
                      <img v-else :src="session.previewUrl" class="w-full h-full object-cover" />
                      
                      <div v-if="session.previewUrl" class="absolute top-1 right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" class="bg-red-500 text-white p-1 rounded-full shadow-sm hover:bg-red-600" @click.stop="removeSessionImage(index)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                  </div>
              </div>

              <div class="flex-1 space-y-4 text-gray-800">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="md:col-span-2">
                        <Label>Session Name <span class="text-destructive">*</span></Label>
                        <Input v-model="session.name" placeholder="Ex. Morning Keynote" class="mt-1.5"/>
                      </div>
                  </div>
                  
                  <div class="space-y-4">
                      <Label>Schedule <span class="text-destructive">*</span></Label>
                      <DateTimeRangePicker 
                         :start="session.start" 
                         :end="session.end" 
                         @update:start="(v) => session.start = v"
                         @update:end="(v) => session.end = v"
                         startLabel="Start"
                         endLabel="End"
                      />
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Location <span class="text-destructive">*</span></Label>
                        <Input v-model="session.location" placeholder="Ex. Room 101" class="mt-1.5"/>
                      </div>
                      <!-- Max Seats: hidden for autoRegister (inherits event maxSeats) -->
                      <div v-if="!session.autoRegister">
                        <Label>Max Seats <span class="text-xs text-gray-400 font-normal">(optional)</span></Label>
                        <Input 
                          type="number" 
                          :value="session.maxSeats ?? ''"
                          @input="(e: Event) => session.maxSeats = (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null"
                          :placeholder="props.eventMaxSeats ? `Max: ${props.eventMaxSeats}` : 'Unlimited'"
                          min="1" 
                          :max="props.eventMaxSeats ?? undefined"
                          class="mt-1.5"
                        />
                        <p v-if="props.eventMaxSeats" class="text-xs text-gray-400 mt-1">
                          Cannot exceed event max: {{ props.eventMaxSeats }}
                        </p>
                      </div>
                      <div v-else class="flex flex-col justify-end">
                        <p class="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 mt-6">
                          <span v-if="props.eventMaxSeats">Inherits event max: <strong>{{ props.eventMaxSeats }}</strong> seats</span>
                          <span v-else>No seat limit (event has no max)</span>
                        </p>
                      </div>
                      <div>
                        <Label>Points</Label>
                        <Input type="number" v-model="session.pointsAwarded" min="0" class="mt-1.5"/>
                      </div>
                  </div>
                    
                  <div class="flex items-center space-x-2 pt-2">
                      <Checkbox :id="'auto-reg-'+index" :checked="session.autoRegister" @update:checked="(v) => session.autoRegister = v" />
                      <Label :for="'auto-reg-'+index" class="cursor-pointer text-sm">Auto Register (Automatically register participants for this session)</Label>
                  </div>
              </div>
            </div>

            <div class="text-gray-800">
              <Label>Description</Label>
              <Textarea v-model="session.description" placeholder="Session details..." class="mt-1.5 min-h-[80px]" />
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>
