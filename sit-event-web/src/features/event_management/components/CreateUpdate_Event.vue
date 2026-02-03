<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '@/features/event_management/store/EventStore'
import { toast } from 'vue-sonner'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { FormType } from '@/features/forms/services/FormServices'

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useCertificateStore, type FrontendCertificateElement } from '@/features/certificate/store/CertificateStore'
import { useFormStore } from '@/features/forms/store/FormStore'
import { Badge } from '@/components/ui/badge'
// --- Custom Components ---
import TagInput from '@/components/ui/commons/TagInput.vue'

const router = useRouter()
const props = defineProps<{
  id?: string
}>()

const eventStore = useEventStore()
const certificateStore = useCertificateStore()
const formStore = useFormStore()
const isEditMode = computed(() => !!props.id)

// --- Constants ---
const ALL_EVENT_TARGET_AUDIENCE = ['EXTERNAL_STUDENT', 'INTERNAL_STUDENT', 'TEACHER', 'PUBLIC']
const ALL_EVENT_TAGS = ['SPEAK', 'EDUCATION', 'WORKSHOP', 'SEMINAR', 'COMPETITION', 'SOCIAL', 'CAREER']

// ==========================================
// --- CERTIFICATE LOGIC START ---
// ==========================================

// 1. Enum & Types
type CertificateFieldType = 
  | 'ParticipantName' 
  | 'EventName' 
  | 'EventStartDate' 
  | 'EventEndDate' 
  | 'Date' 
  | 'SerialNumber' 
  | 'Text' 
  | 'Image';

interface CertificateElement {
  id: string;
  type: CertificateFieldType;
  label: string;
  x: number;
  y: number;
  
  // Text Properties
  value?: string; // For Fixed Text or Date Format or Preview Text
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string; // 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right';
  
  // Image Properties
  width?: number;
  height?: number;
  src?: string | null; // Preview URL
  file?: File | null;  // Actual File
}

// 2. State
const isCertificateDialogOpen = ref(false)
const certificateElements = ref<CertificateElement[]>([])
const selectedElementId = ref<string | null>(null)
const certificateBackground = ref<{ file: File | null; preview: string | null }>({ file: null, preview: null })
const backgroundInputRef = ref<HTMLInputElement | null>(null)

// Canvas Dimensions (Fixed Ratio A4 Landscape approx)
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 565; 

// 3. Computed
const selectedElement = computed(() => 
  certificateElements.value.find(el => el.id === selectedElementId.value)
)

const hasCertificateConfig = computed(() => 
  certificateElements.value.length > 0 || certificateBackground.value.preview !== null
)

// 4. Methods

// -- Element Management --
const addElement = (type: CertificateFieldType) => {
  const newId = crypto.randomUUID();
  
  let baseProps: CertificateElement = {
    id: newId,
    type,
    label: type,
    x: 50,
    y: 50,
    fontSize: 16,
    fontFamily: 'Sarabun',
    color: '#000000',
    fontWeight: 'normal',
    textAlign: 'left',
    width: 100,
    height: 100
  };

  // Default values per type
  switch (type) {
    case 'ParticipantName':
      baseProps.label = 'Participant Name';
      baseProps.value = '{Student Name}';
      baseProps.fontSize = 24;
      baseProps.fontWeight = 'bold';
      break;
    case 'EventName':
      baseProps.label = 'Event Name';
      baseProps.value = '{Event Name}';
      baseProps.fontSize = 20;
      baseProps.fontWeight = 'bold';
      break;
    case 'EventStartDate':
      baseProps.label = 'Start Date';
      baseProps.value = '{Start Date}';
      baseProps.dateFormat = 'D MMMM YYYY';
      break;
    case 'EventEndDate':
      baseProps.label = 'End Date';
      baseProps.value = '{End Date}';
      baseProps.dateFormat = 'D MMMM YYYY';
      break;
    case 'Date':
      baseProps.label = 'Fixed Date';
      baseProps.value = new Date().toLocaleDateString('th-TH');
      baseProps.dateFormat = 'D MMMM YYYY';
      break;
    case 'SerialNumber':
      baseProps.label = 'Serial No.';
      baseProps.value = 'SIT-2024-XXXX';
      baseProps.fontSize = 12;
      break;
    case 'Text':
      baseProps.label = 'Fixed Text';
      baseProps.value = 'ข้อความ';
      break;
    case 'Image':
      baseProps.label = 'Image/Signature';
      baseProps.value = '';
      baseProps.width = 150;
      baseProps.height = 80;
      break;
  }

  certificateElements.value.push(baseProps);
  selectedElementId.value = newId;
}

const removeElement = (id: string) => {
  certificateElements.value = certificateElements.value.filter(e => e.id !== id);
  if (selectedElementId.value === id) selectedElementId.value = null;
}

// -- Background Handling --
const triggerBackgroundUpload = () => {
  backgroundInputRef.value?.click();
}

const handleBackgroundSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file && file.type.startsWith('image/')) {
    certificateBackground.value.file = file;
    certificateBackground.value.preview = URL.createObjectURL(file);
  }
}

const removeBackground = () => {
  certificateBackground.value.file = null;
  certificateBackground.value.preview = null;
  if (backgroundInputRef.value) backgroundInputRef.value.value = '';
}

// -- Image Element Handling --
const handleElementImageUpload = (e: Event, element: CertificateElement) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file && file.type.startsWith('image/')) {
    element.file = file;
    element.src = URL.createObjectURL(file);
  }
}

// -- Drag & Drop Logic --
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const startDrag = (e: MouseEvent, element: CertificateElement) => {
  if (e.button !== 0) return; // Only Left Click
  selectedElementId.value = element.id;
  isDragging.value = true;
  dragOffset.value = {
    x: e.clientX - element.x,
    y: e.clientY - element.y
  };
  
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value || !selectedElement.value) return;
  
  const newX = e.clientX - dragOffset.value.x;
  const newY = e.clientY - dragOffset.value.y;
  
  // Optional: Snap to grid or limits could go here
  selectedElement.value.x = Math.round(newX);
  selectedElement.value.y = Math.round(newY);
}

const stopDrag = () => {
  isDragging.value = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}

// Save Certificate (Mockup Function)
const saveCertificateTemplate = () => {
    // แปลง certificateElements (local) ให้เป็น format ที่ store ต้องการ
    // ในที่นี้เราใช้ interface คล้ายกันอยู่แล้ว
    
    certificateStore.setCertificateData(
        certificateBackground.value.file,
        certificateBackground.value.preview,
        certificateElements.value as FrontendCertificateElement[] // Type assertion or mapping logic needed
    )

    toast.success('บันทึก Template เกียรติบัตรไว้ในรายการแล้ว (จะถูกสร้างเมื่อกด Save Event)');
    isCertificateDialogOpen.value = false;
}

// ==========================================
// --- CERTIFICATE LOGIC END ---
// ==========================================


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
  // (Validation Logic เดิม)
  // if (data.eventStartDate < now) addIssue('eventStartDate', 'วันเริ่มกิจกรรมต้องไม่เป็นอดีต');
  if (data.eventEndDate <= data.eventStartDate) addIssue('eventEndDate', 'วันจบกิจกรรมต้องหลังจากวันเริ่มกิจกรรม');
  if (data.registrationOpenDate > data.eventStartDate) addIssue('registrationOpenDate', 'วันเปิดรับสมัครต้องเกิดก่อนวันเริ่มกิจกรรม');
  if (data.registrationEndDate <= data.registrationOpenDate) addIssue('registrationEndDate', 'วันปิดรับสมัครต้องหลังจากวันเปิดรับสมัคร');
  if (data.registrationEndDate > data.eventEndDate) addIssue('registrationEndDate', 'วันปิดรับสมัครต้องไม่เกินวันจบกิจกรรม');
});

// --- Validation Schema (Sub-Session) ---
const subSessionSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อ Session'),
  description: z.string().optional(),
  start: z.coerce.date(),
  end: z.coerce.date(),
  location: z.string().min(1, 'กรุณาระบุสถานที่'),
  maxSeats: z.coerce.number().min(1, 'จำนวนที่นั่งต้องมีอย่างน้อย 1 ที่นั่ง'),
  pointsAwarded: z.coerce.number().min(0, 'คะแนนต้องไม่ติดลบ'),
  autoRegister: z.boolean().optional(),
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

// --- Image Handling (Event Thumbnail) ---
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
    maxSeats: 1, 
    autoRegister: false,
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
// --- Forms Logic ---
const handleCreateForm = async (type: string) => {
  if (!props.id) {
    toast.error('Please save the event first before adding forms.')
    return
  }
  try {
    const res = await formStore.createInitialForm(props.id, type as FormType)
    router.push({
      name: 'CreateForms',
      params: { id: props.id, formId: res.id },
    })
  } catch (err: any) {
    toast.error('Failed to create form')
  }
}

const handleEditForm = (formId: string) => {
  router.push({
    name: 'CreateForms',
    params: { id: props.id!, formId },
  })
}

const getFormByType = (type: string) => {
  return formStore.formsList.find(f => f.type === type)
}

// Dialog State
const isCreateFormDialogOpen = ref(false)

const createForm = async (type: FormType) => {
  isCreateFormDialogOpen.value = false
  await handleCreateForm(type)
}

// --- Lifecycle ---
onMounted(async () => {
  if (isEditMode.value) {
    try {
      if (!props.id) return;
      await eventStore.fetchEventById(props.id)
      await formStore.fetchForms(props.id) // Fetch forms
      
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

        await certificateStore.fetchCertificate(props.id)

        // Sync Store data back to Local State for editing
        if (certificateStore.pendingElements.length > 0 || certificateStore.currentTemplate) {
          certificateElements.value = certificateStore.pendingElements.map(el => ({
            ...el,
            // Map types if necessary to match CertificateFieldType enum locally
            type: el.type as CertificateFieldType
          }))

          certificateBackground.value = {
            file: certificateStore.pendingBackground,
            preview: certificateStore.pendingPreviewUrl
            // Note: ถ้า Edit Mode ต้อง handle previewUrl จาก Server ด้วย (ใน Store ต้องจัดการ)
          }
        }
        
        // TODO: Load existing certificate data if exists
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
    // 1. Validate Sub-Sessions
    const sessionArraySchema = z.array(subSessionSchema);
    const sessionValidation = sessionArraySchema.safeParse(subSessions.value);

    if (!sessionValidation.success) {
      const firstError = sessionValidation.error.errors[0];
      const sessionIndex = Number(firstError.path[0]) + 1;
      
      toast.error(`Session ที่ ${sessionIndex}: ${firstError.message}`);
      return; 
    }

    // 2. Prepare Form Data
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

    // 3. Execute Submit Actions
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

        // 3.2 Handle Sub-Sessions
        const sessionPromises: Promise<any>[] = []

        // Delete removed sessions
        deletedSessionIds.value.forEach(sessionId => {
            sessionPromises.push(eventStore.deleteSession(targetEventId!, sessionId))
        })

        // Create or Update active sessions
        subSessions.value.forEach(session => {
            const payload = {
                name: session.name,
                description: session.description || '', 
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

        if (targetEventId) {
            await certificateStore.saveCertificate(targetEventId)
        }

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
                <Input type="text" placeholder="Enter event name" v-bind="componentField" id="input-event-name"/>
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
                  id="input-event-description"
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
                        id="input-event-start-date"
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
                        id="input-event-end-date"
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
                        id="input-registration-open-date"
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
                        id="input-registration-end-date"
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

        <div class="space-y-4" v-if="isEditMode">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-800">Event Forms</h2>
            <Button type="button" size="sm" @click="isCreateFormDialogOpen = true">Create Form</Button>
          </div>
          
          <div v-if="formStore.formsList.length > 0" class="grid gap-4">
            <div v-for="form in formStore.formsList" :key="form.id" class="border p-4 rounded-lg flex justify-between items-center bg-white shadow-sm">
              <div>
                <h3 class="font-medium">{{ form.type === FormType.PRE_EVENT ? 'Pre-Event Form' : 'Post-Event Form' }}</h3>
                <p class="text-sm text-gray-500">{{ form.title }}</p>
              </div>
              <div class="flex items-center gap-2">
                 <Badge :variant="form.isActive ? 'default' : 'secondary'">{{ form.isActive ? 'Active' : 'Inactive' }}</Badge>
                 <Button type="button" variant="outline" size="sm" @click="handleEditForm(form.id)">Edit</Button>
              </div>
            </div>
          </div>
          <div v-else class="text-center p-8 bg-gray-50 rounded-lg border border-dashed text-gray-500">
             No forms created yet.
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
                  id="input-target-audience"
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
                  id="input-event-tags"
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

        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-800">Certificate</h2>
          
          <div class="border rounded-lg bg-white shadow-sm p-6 text-gray-800">
             <div v-if="!hasCertificateConfig" class="flex flex-col items-center justify-center py-6 text-center space-y-4">
                 <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/></svg>
                 </div>
                 <div>
                    <h3 class="font-medium text-gray-900">No Certificate Configured</h3>
                    <p class="text-sm text-gray-500 mt-1">Create a certificate for participants to receive upon completion.</p>
                 </div>
                 <Button type="button" variant="outline" @click="isCertificateDialogOpen = true">
                    Create Certificate
                 </Button>
             </div>

             <div v-else class="flex items-center justify-between">
                 <div class="flex items-center gap-4">
                     <div class="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center border border-green-100">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                     </div>
                     <div>
                         <h3 class="font-medium text-gray-900">Certificate Configured</h3>
                         <p class="text-xs text-gray-500">Ready to be issued to participants</p>
                     </div>
                 </div>
                 <Button type="button" variant="outline" @click="isCertificateDialogOpen = true">
                    Edit Certificate
                 </Button>
             </div>
          </div>
        </div>

        <div class="flex justify-end gap-4 pt-4 border-t border-gray-100 text-gray-800">
          <Button type="button" variant="outline" @click="onCancel" id="btn-cancel-event">
            Cancel
          </Button>
          <Button type="submit" id="btn-submit-event">
            {{ isEditMode ? 'Update Event' : 'Create Event' }}
          </Button>
        </div>

      </form>
    </div>

    <Dialog v-model:open="isCertificateDialogOpen">
      <DialogContent class="sm:max-w-[85vw] w-[85vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white text-gray-800">
         
         <DialogHeader class="px-6 py-3 border-b bg-white z-10 flex flex-row items-center justify-between shadow-sm">
             <div class="flex flex-col">
                <DialogTitle>Certificate Editor</DialogTitle>
                <DialogDescription class="text-xs mt-0.5">Drag and drop elements to design your certificate.</DialogDescription>
             </div>
             
             <div class="flex gap-2 flex-wrap items-center">
                 <div class="h-6 w-px bg-gray-200 mx-1"></div>
                 <p class="text-xs text-gray-400 mr-1 font-medium">Add:</p>
                 
                 <div class="flex bg-gray-100 rounded-md p-1 gap-1">
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('ParticipantName')" title="Participant Name">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Name
                    </Button>
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('EventName')" title="Event Name">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                        Event
                    </Button>
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('EventStartDate')" title="Event Start Date">
                        Start Date
                    </Button>
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('EventEndDate')" title="Event End Date">
                        End Date
                    </Button>
                     <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('SerialNumber')" title="Running Number">
                        No.
                    </Button>
                 </div>

                 <div class="flex bg-gray-100 rounded-md p-1 gap-1 ml-2">
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('Text')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
                        Text
                    </Button>
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('Date')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        Fixed Date
                    </Button>
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('Image')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        Image
                    </Button>
                 </div>

                 <div class="h-6 w-px bg-gray-200 mx-1"></div>
                 <Button size="sm" class="h-8 bg-blue-600 hover:bg-blue-700" @click="saveCertificateTemplate">
                    Save Template
                 </Button>
             </div>
         </DialogHeader>
         
         <div class="flex flex-1 overflow-hidden bg-gray-100">
             
             <div class="flex-1 overflow-auto p-8 flex items-center justify-center relative bg-gray-100/50">
                 <div 
                    class="bg-white shadow-xl relative select-none overflow-hidden transition-all ease-in-out"
                    :style="{ 
                      width: CANVAS_WIDTH + 'px', 
                      height: CANVAS_HEIGHT + 'px',
                      flexShrink: 0
                    }"
                    @click.self="selectedElementId = null" 
                 >
                    <div 
                      class="absolute inset-0 z-0 bg-no-repeat bg-center bg-cover pointer-events-none"
                      :style="{ 
                        backgroundImage: certificateBackground.preview ? `url(${certificateBackground.preview})` : 'none',
                        backgroundColor: certificateBackground.preview ? 'transparent' : '#fff'
                      }"
                    >
                       <div v-if="!certificateBackground.preview" class="w-full h-full flex flex-col items-center justify-center text-gray-300 border-2 border-dashed m-4 rounded-lg border-gray-200">
                           <span class="text-sm">No Background Image</span>
                       </div>
                    </div>

                    <div
                      v-for="el in certificateElements"
                      :key="el.id"
                      class="absolute cursor-move flex items-center justify-center whitespace-nowrap group hover:outline hover:outline-1 hover:outline-blue-400 z-10"
                      :class="{ 
                        'outline outline-2 outline-blue-600 shadow-md': selectedElementId === el.id, 
                      }"
                      :style="{
                        left: el.x + 'px',
                        top: el.y + 'px',
                        fontSize: el.fontSize + 'px',
                        color: el.color,
                        fontWeight: el.fontWeight,
                        textAlign: el.textAlign,
                        fontFamily: el.fontFamily,
                        width: el.type === 'Image' ? el.width + 'px' : 'auto',
                        height: el.type === 'Image' ? el.height + 'px' : 'auto',
                      }"
                      @mousedown.stop="(e) => startDrag(e, el)"
                    >
                       <template v-if="el.type === 'Image'">
                           <div class="w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden relative" :class="{'opacity-50': !el.src}">
                               <img v-if="el.src" :src="el.src" class="w-full h-full object-contain" />
                               <span v-else class="text-[10px] text-gray-400">Image</span>
                           </div>
                       </template>
                       <template v-else-if="el.type === 'SerialNumber'">
                           <span>{{ el.value }}</span>
                       </template>
                       <template v-else>
                           <span>{{ el.value || el.label }}</span>
                       </template>
                       
                       <button 
                          v-if="selectedElementId === el.id"
                          class="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center shadow-md text-xs z-50 hover:bg-red-600 transition-transform hover:scale-110"
                          @click.stop="removeElement(el.id)"
                       >
                         ×
                       </button>

                       <div v-if="isDragging && selectedElementId === el.id" class="absolute -top-6 left-0 bg-black text-white text-[9px] px-1 py-0.5 rounded opacity-70">
                          x:{{ Math.round(el.x) }}, y:{{ Math.round(el.y) }}
                       </div>
                    </div>
                 </div>
             </div>

             <div class="w-80 bg-white border-l shadow-sm flex flex-col overflow-y-auto">
                 <div class="p-4 border-b">
                     <h3 class="font-semibold text-sm text-gray-900">Properties</h3>
                 </div>

                 <div v-if="!selectedElement" class="p-4 space-y-6">
                     <div class="space-y-3">
                        <Label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Background</Label>
                        <div 
                          class="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors h-32 relative group"
                          @click="triggerBackgroundUpload"
                        >
                            <input type="file" ref="backgroundInputRef" class="hidden" accept="image/*" @change="handleBackgroundSelect" />
                            
                            <img v-if="certificateBackground.preview" :src="certificateBackground.preview" class="absolute inset-0 w-full h-full object-cover rounded-lg opacity-80" />
                            
                            <div class="z-10 bg-white/80 p-2 rounded-full shadow-sm backdrop-blur-sm group-hover:bg-white transition-all">
                               <svg v-if="!certificateBackground.preview" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                               <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                            </div>
                            <span v-if="!certificateBackground.preview" class="text-xs text-gray-500 mt-2">Upload Background</span>
                        </div>
                        <Button v-if="certificateBackground.preview" variant="destructive" size="sm" class="w-full text-xs" @click="removeBackground">
                           Remove Background
                        </Button>
                     </div>
                     <div class="text-xs text-gray-400 text-center mt-10">
                        Select an element on the canvas to edit its properties.
                     </div>
                 </div>

                 <div v-else class="p-4 space-y-6">
                     <div class="flex items-center justify-between">
                        <span class="text-xs font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded uppercase">{{ selectedElement.type }}</span>
                        <span class="text-xs text-gray-400">ID: {{ selectedElement.id.slice(0,4) }}</span>
                     </div>

                     <div class="space-y-3">
                        <Label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Position</Label>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                               <Label class="text-[10px]">X (px)</Label>
                               <Input type="number" v-model.number="selectedElement.x" class="h-8" />
                            </div>
                            <div class="space-y-1">
                               <Label class="text-[10px]">Y (px)</Label>
                               <Input type="number" v-model.number="selectedElement.y" class="h-8" />
                            </div>
                        </div>
                     </div>

                     <div v-if="selectedElement.type !== 'Image'" class="space-y-3">
                        <Label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Typography</Label>
                        
                        <div class="space-y-1">
                            <Label class="text-[10px]">Font Family</Label>
                            <select v-model="selectedElement.fontFamily" class="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                <option value="Sarabun">Sarabun (TH)</option>
                                <option value="Kanit">Kanit (TH)</option>
                                <option value="Prompt">Prompt (TH)</option>
                                <option value="TH Sarabun New">TH Sarabun New</option>
                                <option value="Arial">Arial</option>
                                <option value="Times New Roman">Times New Roman</option>
                            </select>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                               <Label class="text-[10px]">Size (px)</Label>
                               <Input type="number" v-model.number="selectedElement.fontSize" class="h-8" min="8" />
                            </div>
                            <div class="space-y-1">
                               <Label class="text-[10px]">Color</Label>
                               <div class="flex gap-2">
                                  <Input type="color" v-model="selectedElement.color" class="h-8 w-8 p-0 border-0" />
                                  <Input type="text" v-model="selectedElement.color" class="h-8 flex-1 text-xs" />
                               </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                               <Label class="text-[10px]">Weight</Label>
                               <select v-model="selectedElement.fontWeight" class="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-sm">
                                   <option value="normal">Normal</option>
                                   <option value="bold">Bold</option>
                                   <option value="300">Light</option>
                               </select>
                            </div>
                            <div class="space-y-1">
                               <Label class="text-[10px]">Align</Label>
                               <select v-model="selectedElement.textAlign" class="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-sm">
                                   <option value="left">Left</option>
                                   <option value="center">Center</option>
                                   <option value="right">Right</option>
                               </select>
                            </div>
                        </div>
                     </div>

                     <div class="space-y-3">
                         <Label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Content</Label>
                         
                         <div v-if="selectedElement.type === 'Text' || selectedElement.type === 'Date'" class="space-y-1">
                             <Label class="text-[10px]">{{ selectedElement.type === 'Text' ? 'Text Content' : 'Preview Date' }}</Label>
                             <Input v-model="selectedElement.value" class="h-8" />
                         </div>

                         <div v-if="['EventStartDate', 'EventEndDate', 'Date'].includes(selectedElement.type)" class="space-y-1">
                             <Label class="text-[10px]">Date Format</Label>
                             <select v-model="selectedElement.dateFormat" class="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-sm">
                                   <option value="D MMMM YYYY">25 มกราคม 2568 (Full Thai)</option>
                                   <option value="DD/MM/YYYY">25/01/2568 (Short)</option>
                                   <option value="D MMM YYYY">25 ม.ค. 2568</option>
                                   <option value="YYYY-MM-DD">2025-01-25 (ISO)</option>
                             </select>
                         </div>

                         <div v-if="selectedElement.type === 'Image'" class="space-y-3">
                             <div class="grid grid-cols-2 gap-3">
                                <div class="space-y-1">
                                   <Label class="text-[10px]">Width</Label>
                                   <Input type="number" v-model.number="selectedElement.width" class="h-8" />
                                </div>
                                <div class="space-y-1">
                                   <Label class="text-[10px]">Height</Label>
                                   <Input type="number" v-model.number="selectedElement.height" class="h-8" />
                                </div>
                             </div>
                             <div class="space-y-1">
                                 <Label class="text-[10px]">Source Image</Label>
                                 <Input type="file" class="h-8 text-[10px] file:text-[10px]" accept="image/*" @change="(e) => handleElementImageUpload(e, selectedElement!)" />
                             </div>
                         </div>
                     </div>

                 </div>
             </div>
         </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="isCreateFormDialogOpen">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Form</DialogTitle>
          <DialogDescription>Select the type of form you want to create.</DialogDescription>
        </DialogHeader>
        
        <div class="grid gap-4 py-4">
          <Button 
            type="button" 
            variant="outline" 
            class="h-20 justify-start px-4 w-full" 
            :disabled="!!getFormByType(FormType.PRE_EVENT)"
            @click="createForm(FormType.PRE_EVENT)"
          >
            <div class="text-left w-full">
              <div class="font-semibold">Pre-Event Form</div>
              <div class="text-xs text-muted-foreground whitespace-normal">Form for participants to fill before registration</div>
            </div>
            <div v-if="getFormByType(FormType.PRE_EVENT)" class="ml-auto text-xs text-red-500 font-medium">
              Created
            </div>
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            class="h-20 justify-start px-4 w-full"
            :disabled="!!getFormByType(FormType.POST_EVENT)"
            @click="createForm(FormType.POST_EVENT)"
          >
            <div class="text-left w-full">
              <div class="font-semibold">Post-Event Form</div>
              <div class="text-xs text-muted-foreground whitespace-normal">Feedback form after the event</div>
            </div>
             <div v-if="getFormByType(FormType.POST_EVENT)" class="ml-auto text-xs text-red-500 font-medium">
              Created
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    
  </div>
</template>

<style scoped>
/* Ensure Fonts are available */
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;700&family=Prompt:wght@300;400;700&family=Sarabun:wght@300;400;700&display=swap');

/* Optional: Scrollbar styling for panels */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent; 
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1; 
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8; 
}
</style>