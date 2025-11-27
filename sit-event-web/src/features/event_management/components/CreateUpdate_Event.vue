<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '@/features/event_management/store/EventStore'
import { useDateTimeInputAdapter } from '@/shared/useDateTimeInput'

// --- Shadcn UI Components ---
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

// --- Custom Components & Types ---
import TagInput from '@/components/ui/commons/TagInput.vue'
import { type CreateEventDto, type UpdateEventDto } from '@/features/event_management/services/EventServices'
import { type EventTag, type TargetAudience } from '@/features/event_management/services/EventServices'

const router = useRouter()
const props = defineProps<{
  id?: string
}>()

const eventStore = useEventStore()
const isEditMode = computed(() => !!props.id)

// --- Constants ---
const ALL_EVENT_TARGET_AUDIENCE = ['EXTERNAL_STUDENT', 'INTERNAL_STUDENT', 'TEACHER', 'PUBLIC']
const ALL_EVENT_TAGS = ['SPEAK', 'EDUCATION', 'WORKSHOP', 'SEMINAR', 'COMPETITION', 'SOCIAL', 'CAREER']

// --- Form State ---
const eventForm = ref<{
  name: string
  description: string
  thumbnail: File | null
  images: File[]
  registrationOpenDate: Date
  registrationEndDate: Date
  eventStartDate: Date
  eventEndDate: Date
  targetAudience: string[]
  tags: string[]
}>({
  name: '',
  description: '',
  thumbnail: null,
  images: [],
  registrationOpenDate: new Date(),
  registrationEndDate: new Date(),
  eventStartDate: new Date(),
  eventEndDate: new Date(),
  targetAudience: [],
  tags: [],
})

// --- Date Adapters ---
const regOpenInput = useDateTimeInputAdapter(eventForm, 'registrationOpenDate')
const regEndInput = useDateTimeInputAdapter(eventForm, 'registrationEndDate')
const eventStartInput = useDateTimeInputAdapter(eventForm, 'eventStartDate')
const eventEndInput = useDateTimeInputAdapter(eventForm, 'eventEndDate')

// --- Image Handling ---
const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null)

const openFileDialog = () => fileInput.value?.click()

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file && file.type.startsWith('image/')) {
    setThumbnail(file)
  }
}

const handleDrop = (e: DragEvent) => {
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    setThumbnail(file)
  }
}

const setThumbnail = (file: File) => {
  eventForm.value.thumbnail = file
  previewUrl.value = URL.createObjectURL(file)
}

const removeImage = () => {
  eventForm.value.thumbnail = null
  previewUrl.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// --- Lifecycle ---
onMounted(async () => {
  if (isEditMode.value) {
    await eventStore.fetchEventById(props.id!)
    const eventToEdit = eventStore.currentEvent

    if (eventToEdit) {
      // Map basic data
      eventForm.value = {
        name: eventToEdit.name,
        description: eventToEdit.description,
        registrationOpenDate: new Date(eventToEdit.registrationOpenDate),
        registrationEndDate: new Date(eventToEdit.registrationEndDate),
        eventStartDate: new Date(eventToEdit.eventStartDate),
        eventEndDate: new Date(eventToEdit.eventEndDate),
        thumbnail: null, // จะถูก set ด้านล่าง
        images: [], // ถ้ามี logic ดึง images อื่นๆ ให้เพิ่มตรงนี้
        targetAudience: eventToEdit.targetAudience ?? [],
        tags: eventToEdit.tags ?? [],
      }

      // Handle Thumbnail: Convert URL string to File object
      if (eventToEdit.thumbnail && typeof eventToEdit.thumbnail === 'string') {
        try {
          // 1. Fetch the image blob
          const response = await fetch(eventToEdit.thumbnail)
          const blob = await response.blob()
          
          // 2. Create a File object
          const fileName = eventToEdit.thumbnail.split('/').pop() || 'thumbnail.jpg'
          const file = new File([blob], fileName, { type: blob.type })
          
          // 3. Set to form state
          eventForm.value.thumbnail = file
          previewUrl.value = URL.createObjectURL(file)
        } catch (error) {
          console.error("Failed to load thumbnail image:", error)
          // Fallback: Show URL but keep file as null if fetch fails
          previewUrl.value = eventToEdit.thumbnail
        }
      }
    }
  }
})

// --- Submit ---
const onSubmit = async () => {
  console.log('isEditMode', isEditMode.value)
  try {
    // เตรียมข้อมูลพื้นฐานที่ใช้ร่วมกัน และใส่ property 'images' เพื่อแก้ Type Error
    const baseEventData = {
      name: eventForm.value.name,
      description: eventForm.value.description,
      registrationOpenDate: eventForm.value.registrationOpenDate.toISOString(),
      registrationEndDate: eventForm.value.registrationEndDate.toISOString(),
      eventStartDate: eventForm.value.eventStartDate.toISOString(),
      eventEndDate: eventForm.value.eventEndDate.toISOString(),
      targetAudience: eventForm.value.targetAudience as TargetAudience[], 
      tags: eventForm.value.tags as EventTag[],
      images: eventForm.value.images // [!] เพิ่มบรรทัดนี้ตาม Interface
    }

    if (isEditMode.value) {
      console.log('Updating Event:', props.id)

      const updateDto: UpdateEventDto = {
        ...baseEventData,
        // ถ้ามี thumbnail (File) ให้ส่งไป (Note: Store/Service ต้องรองรับการแปลงเป็น FormData)
        thumbnail: eventForm.value.thumbnail instanceof File ? eventForm.value.thumbnail : undefined
      }

      await eventStore.updateEvent(props.id!, updateDto)

    } else {
      console.log('Creating Event:', eventForm.value)

      const createDto: CreateEventDto = {
        ...baseEventData,
        thumbnail: eventForm.value.thumbnail instanceof File ? eventForm.value.thumbnail : undefined
      }

      await eventStore.createEvent(createDto)
    }

    if (!eventStore.error) {
      alert(isEditMode.value ? 'Event Updated!' : 'Event Created!')
      router.push('/admin/events')
    }
  } catch (err) {
    console.error(err)
  }
}

const onCancel = () => {
  router.back()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 flex justify-center">
    <div class="w-full max-w-4xl bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      
      <div class="mb-8 border-b border-gray-100 pb-4">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">
          {{ isEditMode ? 'Edit Event' : 'Create New Event' }}
        </h1>
        <p class="text-sm text-gray-500 mt-1">
          Fill in the details below to {{ isEditMode ? 'update' : 'create' }} your event.
        </p>
      </div>

      <form @submit.prevent="onSubmit" class="space-y-8">
        
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-800">General Information</h2>
          
          <div class="space-y-2">
            <Label for="name">Event Name</Label>
            <Input id="name" v-model="eventForm.name" placeholder="Enter event name" required />
          </div>

          <div class="space-y-2">
            <Label for="description">Description</Label>
            <Textarea 
              id="description" 
              v-model="eventForm.description" 
              placeholder="Describe your event..." 
              class="min-h-[120px]" 
              required
            />
          </div>
        </div>

        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-800">Schedule & Registration</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <Label>Event Start</Label>
              <Input type="datetime-local" v-model="eventStartInput" class="block w-full" />
            </div>
            <div class="space-y-2">
              <Label>Event End</Label>
              <Input type="datetime-local" v-model="eventEndInput" class="block w-full" />
            </div>

            <div class="space-y-2">
              <Label>Registration Open</Label>
              <Input type="datetime-local" v-model="regOpenInput" class="block w-full" />
            </div>
            <div class="space-y-2">
              <Label>Registration Close</Label>
              <Input type="datetime-local" v-model="regEndInput" class="block w-full" />
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-800">Categorization</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <TagInput
                label="Target Audience"
                placeholder="Select audience..."
                :choices="ALL_EVENT_TARGET_AUDIENCE"
                v-model="eventForm.targetAudience"
              />
            </div>
            <div class="space-y-2">
              <TagInput
                label="Event Tags"
                placeholder="Select tags..."
                :choices="ALL_EVENT_TAGS"
                v-model="eventForm.tags"
              />
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-800">Event Thumbnail</h2>
          
          <div 
            class="relative border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer h-64"
            @dragover.prevent
            @drop.prevent="handleDrop"
            @click="openFileDialog"
          >
            <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFileSelect" />
            
            <div v-if="!previewUrl" class="space-y-2">
              <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </div>
              <div class="text-sm text-gray-600">
                <span class="font-semibold text-blue-600">Click to upload</span> or drag and drop
              </div>
              <p class="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
            </div>

            <div v-else class="w-full h-full relative group">
              <img :src="previewUrl" alt="Thumbnail Preview" class="w-full h-full object-contain rounded-md" />
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm" 
                  @click.stop="removeImage"
                >
                  Remove Image
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-4 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" @click="onCancel">
            Cancel
          </Button>
          <Button type="submit" :disabled="eventStore.isLoadingList">
            {{ eventStore.isLoadingList ? 'Saving...' : (isEditMode ? 'Update Event' : 'Create Event') }}
          </Button>
        </div>

      </form>
    </div>
  </div>
</template>

<style scoped>
</style>