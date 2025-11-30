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

// --- Validation Schema (Zod) ---
const formSchema = z.object({
  name: z.string({ required_error: 'กรุณาระบุชื่อกิจกรรม' }).min(1, 'กรุณาระบุชื่อกิจกรรม'),
  description: z.string({ required_error: 'กรุณาระบุรายละเอียด' }).min(1, 'กรุณาระบุรายละเอียด'),
  
  // Date Fields (Coerce convert string from input -> Date object)
  eventStartDate: z.coerce.date({ required_error: 'กรุณาระบุวันเริ่มงาน' }),
  eventEndDate: z.coerce.date({ required_error: 'กรุณาระบุวันจบงาน' }),
  registrationOpenDate: z.coerce.date({ required_error: 'กรุณาระบุวันเปิดรับสมัคร' }),
  registrationEndDate: z.coerce.date({ required_error: 'กรุณาระบุวันปิดรับสมัคร' }),

  targetAudience: z.array(z.string()).min(1, 'กรุณาเลือกกลุ่มเป้าหมายอย่างน้อย 1 กลุ่ม'),
  tags: z.array(z.string()).min(1, 'กรุณาเลือก Tag อย่างน้อย 1 รายการ'),
  
  // File objects (Optional in schema validation but handled in logic)
  thumbnail: z.custom<File>((val) => val instanceof File, 'กรุณาอัปโหลดรูปปก').nullable().optional(),
  images: z.array(z.custom<File>()).optional(),
}).superRefine((data, ctx) => {
  const now = new Date();
  // ลดความละเอียดลงเหลือระดับนาทีเพื่อป้องกัน error จากเสี้ยววินาทีตอนกด submit
  now.setSeconds(0, 0); 

  // Helper to add issue
  const addIssue = (path: string, message: string) => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: [path],
    });
  };

  // 1. Event Start ต้องไม่เร็วเวลานี้ (Future)
  if (data.eventStartDate < now) {
    addIssue('eventStartDate', 'วันเริ่มกิจกรรมต้องไม่เป็นอดีต');
  }

  // 2. Event End ต้องไม่เร็วเวลานี้ และต้องช้ากว่า Event Start
  if (data.eventEndDate < now) {
    addIssue('eventEndDate', 'วันจบกิจกรรมต้องไม่เป็นอดีต');
  }
  if (data.eventEndDate <= data.eventStartDate) {
    addIssue('eventEndDate', 'วันจบกิจกรรมต้องหลังจากวันเริ่มกิจกรรม');
  }

  // 3. Registration Open ต้องไม่เร็วเวลานี้ และต้องไม่ช้ากว่า Event Start และต้องไม่ช้ากว่า Registration End
  if (data.registrationOpenDate < now) {
    addIssue('registrationOpenDate', 'วันเปิดรับสมัครต้องไม่เป็นอดีต');
  }
  if (data.registrationOpenDate > data.eventStartDate) {
    addIssue('registrationOpenDate', 'วันเปิดรับสมัครต้องเกิดก่อนวันเริ่มกิจกรรม');
  }
  
  // 4. Registration End ต้องไม่เร็วเวลานี้ และต้องช้ากว่า Registration Open และต้องไม่ช้ากว่า Event End
  if (data.registrationEndDate < now) {
    addIssue('registrationEndDate', 'วันปิดรับสมัครต้องไม่เป็นอดีต');
  }
  if (data.registrationEndDate <= data.registrationOpenDate) {
    addIssue('registrationEndDate', 'วันปิดรับสมัครต้องหลังจากวันเปิดรับสมัคร');
  }
  if (data.registrationEndDate > data.eventEndDate) {
    addIssue('registrationEndDate', 'วันปิดรับสมัครต้องไม่เกินวันจบกิจกรรม');
  }
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
  form.setFieldValue('thumbnail', file) // Update VeeValidate state
  previewUrl.value = URL.createObjectURL(file)
}

const removeImage = () => {
  form.setFieldValue('thumbnail', null) // Update VeeValidate state
  previewUrl.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// --- Lifecycle ---
onMounted(async () => {
  if (isEditMode.value) {
    try {
      if (!props.id) return;
      await eventStore.fetchEventById(props.id)
      const eventToEdit = eventStore.currentEvent

      if (eventToEdit) {
        // Set values to form
        form.setValues({
          name: eventToEdit.name,
          description: eventToEdit.description,
          eventStartDate: new Date(eventToEdit.eventStartDate),
          eventEndDate: new Date(eventToEdit.eventEndDate),
          registrationOpenDate: new Date(eventToEdit.registrationOpenDate),
          registrationEndDate: new Date(eventToEdit.registrationEndDate),
          targetAudience: eventToEdit.targetAudience ?? [],
          tags: eventToEdit.tags ?? [],
          // Thumbnail handled separately for preview, but we can set null initially or handle file conversion
        })

        // Handle Thumbnail Preview
        if (eventToEdit.thumbnail && typeof eventToEdit.thumbnail === 'string') {
          previewUrl.value = eventToEdit.thumbnail
          
          // Note: เราไม่จำเป็นต้อง convert URL เป็น File object เพื่อใส่ form state 
          // ยกเว้นว่า backend บังคับส่ง file ตลอดเวลาแม้ไม่ได้แก้
          // แต่เพื่อความสมบูรณ์ตามโค้ดเดิมที่พยายาม convert:
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

    const submitAction = async () => {
        // ใช้ Type assertion เฉพาะจุดที่ส่งไป store ถ้า store ยังไม่ได้ update type
        // แต่จริงๆ ควรแก้ store ให้รับ type ที่ถูกต้อง
        if (isEditMode.value && props.id) {
            await eventStore.updateEvent(props.id, formData as any)
        } else {
            await eventStore.createEvent(formData as any)
        }
        
        if (eventStore.error) {
            throw new Error(typeof eventStore.error === 'string' ? eventStore.error : 'เกิดข้อผิดพลาดจากระบบ')
        }
    }

    toast.promise(submitAction(), {
        loading: isEditMode.value ? 'กำลังอัปเดตข้อมูล...' : 'กำลังสร้างกิจกรรม...',
        success: isEditMode.value ? 'อัปเดตกิจกรรมเรียบร้อยแล้ว' : 'สร้างกิจกรรมใหม่สำเร็จ',
        error: (err: any) => err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    })

    // รอสักนิดเพื่อให้ Toast ขึ้นก่อนเปลี่ยนหน้า หรือเปลี่ยนทันทีตาม Logic เดิม
    setTimeout(() => {
         router.push({ name: 'OrgEventView' })
    }, 1000)

  } catch (err: any) {
    console.error(err)
    // Vee-validate handles validation errors, this catch is for system errors
  }
})

const onCancel = () => {
  router.back()
}

// Helper function สำหรับแปลง Date Object เป็น String format 'YYYY-MM-DDTHH:mm' สำหรับ input type="datetime-local"
const toDateTimeLocal = (date?: Date) => {
  if (!date || isNaN(date.getTime())) return '';
  // สร้างฟังก์ชันเติมเลข 0 ข้างหน้า
  const pad = (num: number) => num.toString().padStart(2, '0');
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // เดือนเริ่มที่ 0
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
        
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-800">General Information</h2>
          
          <FormField v-slot="{ componentField }" name="name">
            <FormItem>
              <FormLabel>
                Event Name <span class="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input type="text" placeholder="Enter event name" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="description">
            <FormItem>
              <FormLabel>
                Description <span class="text-destructive">*</span>
              </FormLabel>
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
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div class="flex justify-end gap-4 pt-4 border-t border-gray-100">
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