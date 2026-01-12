<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '@/features/event_management/store/EventStore'
import { toast } from 'vue-sonner'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'

// --- Shadcn UI Components ---
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// --- Custom Components ---
import TagInput from '@/components/ui/commons/TagInput.vue'

const router = useRouter()
const props = defineProps<{
  id?: string
}>()

const eventStore = useEventStore()
const isEditMode = computed(() => !!props.id)

// --- Constants ---
const ALL_EVENT_TARGET_AUDIENCE = ['EXTERNAL_STUDENT', 'INTERNAL_STUDENT', 'TEACHER', 'PUBLIC']
const ALL_EVENT_TAGS = ['SPEAK', 'EDUCATION', 'WORKSHOP', 'SEMINAR', 'COMPETITION', 'SOCIAL', 'CAREER']

// --- Sub-Session Types & State ---
interface SubSession {
  id: string
  isNew: boolean
  name: string
  description: string
  start: Date
  end: Date
  location: string
  maxSeats: number
  pointsAwarded: number
  isExpanded: boolean
  thumbnail: File | null
  previewUrl: string | null
}

const subSessions = ref<SubSession[]>([])
const deletedSessionIds = ref<string[]>([]) 

// --- Validation Schema (Main Event) ---
const formSchema = z.object({
  name: z.string({ required_error: 'กรุณาระบุชื่อกิจกรรม' }).min(1, 'กรุณาระบุชื่อกิจกรรม'),
  description: z.string({ required_error: 'กรุณาระบุรายละเอียด' }).min(1, 'กรุณาระบุรายละเอียด'),
  eventStartDate: z.coerce.date({ required_error: 'กรุณาระบุวันเริ่มงาน' }),
  eventEndDate: z.coerce.date({ required_error: 'กรุณาระบุวันจบงาน' }),
  registrationOpenDate: z.coerce.date({ required_error: 'กรุณาระบุวันเปิดรับสมัคร' }),
  registrationEndDate: z.coerce.date({ required_error: 'กรุณาระบุวันปิดรับสมัคร' }),
  targetAudience: z.array(z.string()).min(1, 'กรุณาเลือกกลุ่มเป้าหมายอย่างน้อย 1 กลุ่ม'),
  tags: z.array(z.string()).min(1, 'กรุณาเลือก Tag อย่างน้อย 1 รายการ'),
  thumbnail: z.custom<File>((val) => val instanceof File, 'กรุณาอัปโหลดรูปปก').nullable().optional(),
  images: z.array(z.custom<File>()).optional(),
}).superRefine((data, ctx) => {
  const now = new Date();
  now.setSeconds(0, 0); 
  const addIssue = (path: string, message: string) => {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
  };
  if (data.eventStartDate < now) addIssue('eventStartDate', 'วันเริ่มกิจกรรมต้องไม่เป็นอดีต');
  if (data.eventEndDate < now) addIssue('eventEndDate', 'วันจบกิจกรรมต้องไม่เป็นอดีต');
  if (data.eventEndDate <= data.eventStartDate) addIssue('eventEndDate', 'วันจบกิจกรรมต้องหลังจากวันเริ่มกิจกรรม');
  if (data.registrationOpenDate < now) addIssue('registrationOpenDate', 'วันเปิดรับสมัครต้องไม่เป็นอดีต');
  if (data.registrationOpenDate > data.eventStartDate) addIssue('registrationOpenDate', 'วันเปิดรับสมัครต้องเกิดก่อนวันเริ่มกิจกรรม');
  if (data.registrationEndDate < now) addIssue('registrationEndDate', 'วันปิดรับสมัครต้องไม่เป็นอดีต');
  if (data.registrationEndDate <= data.registrationOpenDate) addIssue('registrationEndDate', 'วันปิดรับสมัครต้องหลังจากวันเปิดรับสมัคร');
  if (data.registrationEndDate > data.eventEndDate) addIssue('registrationEndDate', 'วันปิดรับสมัครต้องไม่เกินวันจบกิจกรรม');
});

// --- Validation Schema (Sub-Session) ---
// [NEW] เพิ่ม Schema สำหรับตรวจสอบ Sub-Session
const subSessionSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อ Session'),
  description: z.string().optional(),
  start: z.coerce.date(),
  end: z.coerce.date(),
  location: z.string().min(1, 'กรุณาระบุสถานที่'),
  // [FIX] เพิ่มเงื่อนไข min(1) ตรงนี้เพื่อป้องกัน API Error
  maxSeats: z.coerce.number().min(1, 'จำนวนที่นั่งต้องมีอย่างน้อย 1 ที่นั่ง'),
  pointsAwarded: z.coerce.number().min(0, 'คะแนนต้องไม่ติดลบ'),
}).refine((data) => data.end > data.start, {
  message: "เวลาจบ Session ต้องหลังจากเวลาเริ่ม",
  path: ["end"],
});

// --- Form Initialization ---
const form = useForm({
  validationSchema: toTypedSchema(formSchema),
  initialValues: {
    name: '',
    description: '',
    eventStartDate: new Date(),
    eventEndDate: new Date(),
    registrationOpenDate: new Date(),
    registrationEndDate: new Date(),
    targetAudience: [],
    tags: [],
    thumbnail: null,
    images: [],
  },
})

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
  form.setFieldValue('thumbnail', file) 
  previewUrl.value = URL.createObjectURL(file)
}

const removeImage = () => {
  form.setFieldValue('thumbnail', null)
  previewUrl.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// --- Sub-Session Logic ---
const addSubSession = () => {
  subSessions.value.push({
    id: crypto.randomUUID(),
    isNew: true, 
    name: '',
    description: '',
    start: new Date(),
    end: new Date(),
    location: '',
    // [FIX] Default เป็น 1 เพื่อไม่ให้ติดลบตั้งแต่แรก แต่ Validation จะคอยกันให้อีกที
    maxSeats: 1, 
    pointsAwarded: 0,
    thumbnail: null,
    previewUrl: null,
    isExpanded: true
  })
}

const removeSubSession = (index: number) => {
  const session = subSessions.value[index]
  if (confirm('Are you sure you want to delete this session?')) {
    if (!session.isNew) {
      deletedSessionIds.value.push(session.id)
    }
    subSessions.value.splice(index, 1)
  }
}

const toggleExpandSession = (index: number) => {
  subSessions.value[index].isExpanded = !subSessions.value[index].isExpanded
}

const handleSessionImageSelect = (index: number, e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file && file.type.startsWith('image/')) {
    subSessions.value[index].thumbnail = file
    subSessions.value[index].previewUrl = URL.createObjectURL(file)
  }
}

const removeSessionImage = (index: number) => {
  subSessions.value[index].thumbnail = null
  subSessions.value[index].previewUrl = null
}


// --- Lifecycle ---
onMounted(async () => {
  if (isEditMode.value) {
    try {
      if (!props.id) return;
      await eventStore.fetchEventById(props.id)
      const eventToEdit = eventStore.currentEvent

      if (eventToEdit) {
        form.setValues({
          name: eventToEdit.name,
          description: eventToEdit.description,
          eventStartDate: new Date(eventToEdit.eventStartDate),
          eventEndDate: new Date(eventToEdit.eventEndDate),
          registrationOpenDate: new Date(eventToEdit.registrationOpenDate),
          registrationEndDate: new Date(eventToEdit.registrationEndDate),
          targetAudience: eventToEdit.targetAudience ?? [],
          tags: eventToEdit.tags ?? [],
        })

        if (eventToEdit.thumbnail && typeof eventToEdit.thumbnail === 'string') {
          previewUrl.value = eventToEdit.thumbnail
          try {
             const response = await fetch(eventToEdit.thumbnail)
             const blob = await response.blob()
             const fileName = eventToEdit.thumbnail.split('/').pop() || 'thumbnail.jpg'
             const file = new File([blob], fileName, { type: blob.type })
             form.setFieldValue('thumbnail', file)
          } catch (e) {
             console.error("Cannot convert existing image to File", e)
          }
        }

        // Fetch Sub-Sessions
        await eventStore.fetchEventSessions(props.id)
        if (eventStore.currentEventSessions) {
          subSessions.value = eventStore.currentEventSessions.map(s => ({
            id: s.id,
            isNew: false, 
            name: s.name,
            description: s.description,
            start: new Date(s.startTime),
            end: new Date(s.endTime),
            location: s.location,
            maxSeats: s.maxSeats,
            pointsAwarded: s.pointsAwarded,
            isExpanded: false,
            thumbnail: null,
            previewUrl: null
          }))
        }
      }
    } catch (error) {
      console.error("Error fetching event details:", error)
      toast.error('ไม่สามารถโหลดข้อมูลกิจกรรมได้')
    }
  }
})

// --- Submit Handler ---
const onSubmit = form.handleSubmit(async (values) => {
  try {
    // ---------------------------------------------------------
    // [NEW] 1. Validate Sub-Sessions ก่อนยิง API
    // ---------------------------------------------------------
    const sessionArraySchema = z.array(subSessionSchema);
    const sessionValidation = sessionArraySchema.safeParse(subSessions.value);

    if (!sessionValidation.success) {
      // ดึง Error ตัวแรกมาแสดง
      const firstError = sessionValidation.error.errors[0];
      const sessionIndex = Number(firstError.path[0]) + 1;
      
      toast.error(`Session ที่ ${sessionIndex}: ${firstError.message}`);
      return; // หยุดการทำงานทันที
    }

    // ---------------------------------------------------------
    // 2. Prepare Form Data (Main Event)
    // ---------------------------------------------------------
    const formData = new FormData()
    
    formData.append('name', values.name)
    formData.append('description', values.description)
    formData.append('registrationOpenDate', values.registrationOpenDate.toISOString())
    formData.append('registrationEndDate', values.registrationEndDate.toISOString())
    formData.append('eventStartDate', values.eventStartDate.toISOString())
    formData.append('eventEndDate', values.eventEndDate.toISOString())
    
    values.targetAudience.forEach((t) => formData.append('targetAudience', t))
    values.tags.forEach((tag) => formData.append('tags', tag))

    if (values.images && values.images.length > 0) {
       values.images.forEach((img) => formData.append('images', img))
    }

    if (values.thumbnail instanceof File) {
      formData.append('thumbnail', values.thumbnail)
    }

    let targetEventId = props.id

    // ---------------------------------------------------------
    // 3. Execute Submit Actions
    // ---------------------------------------------------------
    const submitAction = async () => {
        // 3.1 Save Main Event
        if (isEditMode.value && props.id) {
            await eventStore.updateEvent(props.id, formData as any)
        } else {
            const newEvent = await eventStore.createEvent(formData as any)
            if (newEvent) targetEventId = newEvent.id
        }
        
        if (eventStore.error) {
            throw new Error(typeof eventStore.error === 'string' ? eventStore.error : 'เกิดข้อผิดพลาดจากระบบ')
        }

        if (!targetEventId) throw new Error('ไม่พบ ID ของกิจกรรม (Event ID missing)')

        // 3.2 Handle Sub-Sessions (Create/Update/Delete)
        const sessionPromises: Promise<any>[] = []

        // Delete removed sessions
        deletedSessionIds.value.forEach(sessionId => {
            sessionPromises.push(eventStore.deleteSession(targetEventId!, sessionId))
        })

        // Create or Update active sessions
        subSessions.value.forEach(session => {
            const payload = {
                name: session.name,
                description: session.description || '', // Default to empty string if missing
                startTime: session.start.toISOString(),
                endTime: session.end.toISOString(),
                location: session.location,
                maxSeats: Number(session.maxSeats),
                pointsAwarded: Number(session.pointsAwarded)
            }

            if (session.isNew) {
                sessionPromises.push(eventStore.createSession(targetEventId!, payload))
            } else {
                sessionPromises.push(eventStore.updateSession(targetEventId!, session.id, payload))
            }
        })

        await Promise.all(sessionPromises)
    }

    toast.promise(submitAction(), {
        loading: isEditMode.value ? 'กำลังอัปเดตข้อมูล...' : 'กำลังสร้างกิจกรรม...',
        success: isEditMode.value ? 'อัปเดตกิจกรรมเรียบร้อยแล้ว' : 'สร้างกิจกรรมใหม่สำเร็จ',
        error: (err: any) => err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    })

    setTimeout(() => {
          router.push({ name: 'OrgEventView' })
    }, 1500)

  } catch (err: any) {
    console.error(err)
  }
})

const onCancel = () => {
  router.back()
}

// Helper function
const toDateTimeLocal = (date?: Date) => {
  if (!date || isNaN(date.getTime())) return '';
  const pad = (num: number) => num.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

      <form @submit="onSubmit" class="space-y-8">
        
        <div class="space-y-4 text-gray-800">
          <h2 class="text-lg font-semibold text-gray-800">General Information</h2>
          
          <FormField v-slot="{ componentField }" name="name">
            <FormItem>
              <FormLabel>Event Name <span class="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input type="text" placeholder="Enter event name" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="description">
            <FormItem>
              <FormLabel>Description <span class="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your event..." 
                  class="min-h-[120px]" 
                  v-bind="componentField" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-800">Schedule & Registration</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-800">
            <FormField v-slot="{ field, handleChange }" name="eventStartDate">
              <FormItem>
                <FormLabel>Event Start <span class="text-destructive">*</span></FormLabel>
                <FormControl>
                    <Input 
                        type="datetime-local" 
                        class="block w-full"
                        :value="toDateTimeLocal(field.value)"
                        @change="(e:any) => handleChange(new Date((e.target as HTMLInputElement).value))"
                    />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ field, handleChange }" name="eventEndDate">
              <FormItem>
                <FormLabel>Event End <span class="text-destructive">*</span></FormLabel>
                <FormControl>
                    <Input 
                        type="datetime-local" 
                        class="block w-full"
                        :value="toDateTimeLocal(field.value)"
                        @change="(e:any) => handleChange(new Date((e.target as HTMLInputElement).value))"
                    />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ field, handleChange }" name="registrationOpenDate">
              <FormItem>
                <FormLabel>Registration Open <span class="text-destructive">*</span></FormLabel>
                <FormControl>
                    <Input 
                        type="datetime-local" 
                        class="block w-full"
                        :value="toDateTimeLocal(field.value)"
                        @change="(e:any) => handleChange(new Date((e.target as HTMLInputElement).value))"
                    />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ field, handleChange }" name="registrationEndDate">
              <FormItem>
                <FormLabel>Registration Close <span class="text-destructive">*</span></FormLabel>
                <FormControl>
                    <Input 
                        type="datetime-local" 
                        class="block w-full"
                        :value="toDateTimeLocal(field.value)"
                        @change="(e:any) => handleChange(new Date((e.target as HTMLInputElement).value))"
                    />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-800">Sub-Sessions</h2>
            <Button type="button" variant="outline" size="sm" @click="addSubSession">
              + Add Session
            </Button>
          </div>
          
          <div v-if="subSessions.length === 0" class="text-center p-8 border border-dashed rounded-lg bg-gray-50 text-gray-400 text-sm">
            No sub-sessions added yet.
          </div>

          <div v-else class="space-y-4">
            <div 
              v-for="(session, index) in subSessions" 
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
                    <svg v-if="session.isExpanded" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    class="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    @click="removeSubSession(index)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
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
                               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
                      
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Start Time <span class="text-destructive">*</span></Label>
                          <Input 
                            type="datetime-local" 
                            class="mt-1.5"
                            :value="toDateTimeLocal(session.start)"
                            @change="(e:any) => session.start = new Date(e.target.value)"
                          />
                        </div>
                        <div>
                          <Label>End Time <span class="text-destructive">*</span></Label>
                          <Input 
                            type="datetime-local" 
                            class="mt-1.5"
                            :value="toDateTimeLocal(session.end)"
                            @change="(e:any) => session.end = new Date(e.target.value)"
                          />
                        </div>
                      </div>

                       <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label>Location <span class="text-destructive">*</span></Label>
                            <Input v-model="session.location" placeholder="Ex. Room 101" class="mt-1.5"/>
                          </div>
                          <div>
                            <Label>Max Seats <span class="text-destructive">*</span></Label>
                            <Input type="number" v-model="session.maxSeats" min="1" class="mt-1.5"/>
                          </div>
                          <div>
                            <Label>Points</Label>
                            <Input type="number" v-model="session.pointsAwarded" min="0" class="mt-1.5"/>
                          </div>
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

        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-800">Categorization</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField v-slot="{ value, handleChange }" name="targetAudience">
              <FormItem>
                <TagInput
                  label="Target Audience"
                  placeholder="Select audience..."
                  :choices="ALL_EVENT_TARGET_AUDIENCE"
                  :model-value="value" 
                  @update:model-value="handleChange"
                  :required="true"
                />
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ value, handleChange }" name="tags">
                <FormItem>
                <TagInput
                  label="Event Tags"
                  placeholder="Select tags..."
                  :choices="ALL_EVENT_TAGS"
                  :model-value="value"
                  @update:model-value="handleChange"
                  :required="true"
                />
                <FormMessage />
              </FormItem>
            </FormField>
          </div>
        </div>

        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-800">Event Thumbnail</h2>
          
          <FormField name="thumbnail">
             <FormItem>
                <div 
                   class="relative border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer h-64"
                   :class="{ 'border-red-500 bg-red-50': form.errors.value.thumbnail }"
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
                <FormMessage />
             </FormItem>
          </FormField>
        </div>

        <div class="flex justify-end gap-4 pt-4 border-t border-gray-100 text-gray-800">
          <Button type="button" variant="outline" @click="onCancel">
            Cancel
          </Button>
          <Button type="submit">
            {{ isEditMode ? 'Update Event' : 'Create Event' }}
          </Button>
        </div>

      </form>
    </div>
  </div>
</template>

<style scoped>
</style>