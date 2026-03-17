<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '@/features/event_management/store/EventStore'
import { useCertificateStore } from '@/features/certificate/store/CertificateStore'
import { useFormStore } from '@/features/forms/store/FormStore'
import { FormType } from '@/features/forms/services/FormServices'
import { toast } from 'vue-sonner'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'

// Components
import { Button } from '@/components/ui/button'
import Step1_GeneralInfo from './create_event/Step1_GeneralInfo.vue'
import Step2_SubSession from './create_event/Step2_SubSession.vue'
import Step3_SurveyForm from './create_event/Step3_SurveyForm.vue'
import Step4_Certificate from './create_event/Step4_Certificate.vue'
import Step5_Preview from './create_event/Step5_Preview.vue'

const router = useRouter()
const props = defineProps<{
  id?: string
}>()

const eventStore = useEventStore()
const certificateStore = useCertificateStore()
const formStore = useFormStore()
const isEditMode = computed(() => !!props.id)

// Sub-Sessions State
interface LocalSubSession {
  id: string
  isNew: boolean
  name: string
  description: string
  start: Date
  end: Date
  location: string
  maxSeats: number
  pointsAwarded: number
  autoRegister: boolean
  isExpanded: boolean
  thumbnail: File | null
  previewUrl: string | null
}
const subSessions = ref<LocalSubSession[]>([])
const deletedSessionIds = ref<string[]>([]) 

// Forms State
const wantPreEventForm = ref(false)
const wantPostEventForm = ref(false)

// Constants
const ALL_EVENT_TARGET_AUDIENCE = ['EXTERNAL_STUDENT', 'INTERNAL_STUDENT', 'TEACHER', 'PUBLIC']
const ALL_EVENT_TAGS = ['SPEAK', 'EDUCATION', 'WORKSHOP', 'SEMINAR', 'COMPETITION', 'SOCIAL', 'CAREER']

// UI State
const currentStep = ref(1)
const totalSteps = 5
const isSubmitting = ref(false)
const isSessionLoading = ref(false)
const isFormLoading = ref(false)
const isThumbnailLoading = ref(false)
const isCertificateLoading = ref(false)
const submitStatus = ref({
  event: 'pending' as 'pending' | 'loading' | 'done' | 'error',
  sessions: 'pending' as 'pending' | 'loading' | 'done' | 'error',
  certificate: 'pending' as 'pending' | 'loading' | 'done' | 'error',
  forms: 'pending' as 'pending' | 'loading' | 'done' | 'error'
})

// Stepper Configuration
const steps = [
  { id: 1, name: 'General', desc: 'Event details' },
  { id: 2, name: 'Sessions', desc: 'Sub-sessions' },
  { id: 3, name: 'Forms', desc: 'Surveys' },
  { id: 4, name: 'Certificate', desc: 'Template' },
  { id: 5, name: 'Preview', desc: 'Confirm' }
]

// Validation Schemas
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
  const addIssue = (path: string, message: string) => {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
  };
  if (data.eventEndDate <= data.eventStartDate) addIssue('eventEndDate', 'วันจบกิจกรรมต้องหลังจากวันเริ่มกิจกรรม');
  if (data.registrationOpenDate > data.eventStartDate) addIssue('registrationOpenDate', 'วันเปิดรับสมัครต้องเกิดก่อนวันเริ่มกิจกรรม');
  if (data.registrationEndDate <= data.registrationOpenDate) addIssue('registrationEndDate', 'วันปิดรับสมัครต้องหลังจากวันเปิดรับสมัคร');
  if (data.registrationEndDate > data.eventEndDate) addIssue('registrationEndDate', 'วันปิดรับสมัครต้องไม่เกินวันจบกิจกรรม');
});

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

// Image Handling
const previewUrl = ref<string | null>(null)

const setThumbnail = (file: File) => {
  form.setFieldValue('thumbnail', file) 
  previewUrl.value = URL.createObjectURL(file)
}

const removeImage = () => {
  form.setFieldValue('thumbnail', null)
  previewUrl.value = null
}

const step4Ref = ref<any>(null)

// Load Data
onMounted(async () => {
  if (isEditMode.value) {
    if (!props.id) return;

    try {
      isThumbnailLoading.value = true
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
      }
    } finally {
      isThumbnailLoading.value = false
    }

    try {
      isFormLoading.value = true
      await formStore.fetchForms(props.id)
      wantPreEventForm.value = formStore.formsList.some(f => f.type === FormType.PRE_EVENT)
      wantPostEventForm.value = formStore.formsList.some(f => f.type === FormType.POST_EVENT)
    } finally {
      isFormLoading.value = false
    }

    try {
      isSessionLoading.value = true
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
          autoRegister: s.autoRegister,
          isExpanded: false,
          thumbnail: null,
          previewUrl: null
        }))
      }
    } finally {
      isSessionLoading.value = false
    }

    try {
      isCertificateLoading.value = true
      await certificateStore.fetchCertificate(props.id)
      if (step4Ref.value) {
         step4Ref.value.initFromStore(props.id)
      }
    } finally {
      isCertificateLoading.value = false
    }
  }
})

const handleRemoveSubSession = (index: number) => {
  const session = subSessions.value[index]
  if (session && !session.isNew) {
    deletedSessionIds.value.push(session.id)
  }
  subSessions.value.splice(index, 1)
}

// --- Navigation Logic ---
const nextStep = async () => {
    // Validation before proceed
    if (currentStep.value === 1) {
        const result = await form.validate()
        if (!result.valid) {
            toast.error('กรุณาตรวจสอบข้อมูลที่กรอกให้ถูกต้องครบถ้วน')
            return
        }
    }

    if (currentStep.value === 2) {
        if (subSessions.value.length > 0) {
            const sessionArraySchema = z.array(subSessionSchema);
            const sessionValidation = sessionArraySchema.safeParse(subSessions.value);

            if (!sessionValidation.success) {
                const firstError = sessionValidation.error.errors[0];
                if (firstError) {
                   const sessionIndex = Number(firstError.path[0]) + 1;
                   toast.error(`Session ที่ ${sessionIndex}: ${firstError.message}`);
                }
                return; 
            }
        }
    }

    if (currentStep.value === 4) {
        if (step4Ref.value && !step4Ref.value.validateForm()) {
            return;
        }
    }

    if (currentStep.value < totalSteps) {
        currentStep.value++;
    } else {
        submitEvent()
    }
}

const prevStep = () => {
    if (currentStep.value > 1) {
        currentStep.value--;
    }
}

const handleSkip = () => {
    nextStep()
}

// --- Submit Logic (Triggered in Step 5) ---
const submitEvent = async () => {
  isSubmitting.value = true;
  
  try {
    const values = form.values
    const formData = new FormData()
    
    formData.append('name', values.name!)
    formData.append('description', values.description!)
    formData.append('registrationOpenDate', values.registrationOpenDate!.toISOString())
    formData.append('registrationEndDate', values.registrationEndDate!.toISOString())
    formData.append('eventStartDate', values.eventStartDate!.toISOString())
    formData.append('eventEndDate', values.eventEndDate!.toISOString())
    
    values.targetAudience?.forEach((t) => formData.append('targetAudience', t))
    values.tags?.forEach((tag) => formData.append('tags', tag))

    if (values.thumbnail instanceof File) {
      formData.append('thumbnail', values.thumbnail)
    }

    let targetEventId = props.id

    // Reset status
    submitStatus.value = {
        event: 'loading',
        sessions: 'pending',
        certificate: 'pending',
        forms: 'pending'
    }

    // 1. Save main event
    if (isEditMode.value && props.id) {
        await eventStore.updateEvent(props.id, formData as any)
    } else {
        const newEvent = await eventStore.createEvent(formData as any)
        if (newEvent) targetEventId = newEvent.id
    }
    
    if (eventStore.error) {
        submitStatus.value.event = 'error'
        throw new Error(typeof eventStore.error === 'string' ? eventStore.error : 'เกิดข้อผิดพลาดจากระบบ')
    }

    if (!targetEventId) {
        submitStatus.value.event = 'error'
        throw new Error('ไม่พบ ID ของกิจกรรม (Event ID missing)')
    }
    
    submitStatus.value.event = 'done'
    submitStatus.value.sessions = 'loading'

    // 2. Handle sub-sessions
    const sessionPromises: Promise<any>[] = []
    deletedSessionIds.value.forEach(sessionId => {
        sessionPromises.push(eventStore.deleteSession(targetEventId!, sessionId))
    })

    subSessions.value.forEach(session => {
        const payload = {
            name: session.name,
            description: session.description || '', 
            startTime: session.start.toISOString(),
            endTime: session.end.toISOString(),
            location: session.location,
            maxSeats: Number(session.maxSeats),
            pointsAwarded: Number(session.pointsAwarded),
            autoRegister: session.autoRegister
        }

        if (session.isNew) {
            sessionPromises.push(eventStore.createSession(targetEventId!, payload))
        } else {
           sessionPromises.push(eventStore.updateSession(targetEventId!, session.id, payload))
        }
    })

    try {
        await Promise.all(sessionPromises)
        submitStatus.value.sessions = 'done'
    } catch (e) {
        submitStatus.value.sessions = 'error'
        throw e
    }

    // 3. Handle Certificate
    if (targetEventId && step4Ref.value && step4Ref.value.hasCertificateConfig) {
        submitStatus.value.certificate = 'loading'
        try {
            await step4Ref.value.saveCertificate(targetEventId)
            submitStatus.value.certificate = 'done'
        } catch (e) {
            submitStatus.value.certificate = 'error'
            throw e
        }
    }

    // 4. Handle Forms for new events
    if (!isEditMode.value && targetEventId && (wantPreEventForm.value || wantPostEventForm.value)) {
       submitStatus.value.forms = 'loading'
       const formPromises: Promise<any>[] = []
       if (wantPreEventForm.value) {
           formPromises.push(formStore.createInitialForm(targetEventId, FormType.PRE_EVENT))
       }
       if (wantPostEventForm.value) {
           formPromises.push(formStore.createInitialForm(targetEventId, FormType.POST_EVENT))
       }
       
       try {
           await Promise.all(formPromises)
           submitStatus.value.forms = 'done'
       } catch (e) {
           submitStatus.value.forms = 'error'
           throw e
       }
    }

    toast.success(isEditMode.value ? 'อัปเดตกิจกรรมเรียบร้อยแล้ว' : 'สร้างกิจกรรมใหม่สำเร็จ')
    router.push({ name: 'OrgEventView' })

  } catch (err: any) {
    console.error(err)
    toast.error(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    isSubmitting.value = false;
  }
}

const onCancel = () => {
  router.push({ name: 'OrgEventView' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 flex flex-col items-center">
    
    <!-- STEPPER UI SETTINGS -->
    <div class="w-full max-w-4xl mb-8" v-if="!isSubmitting">
       <div class="flex items-center justify-between relative px-4 mt-8">
          <div class="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-gray-200 z-0 rounded-full"></div>
          <div class="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-blue-600 z-0 transition-all duration-300 rounded-full border border-blue-600" :style="{ width: `calc(${((currentStep - 1) / (totalSteps - 1) * 100)}% - 2rem)` }"></div>
          
          <div v-for="step in steps" :key="step.id" class="relative z-10 flex flex-col items-center gap-2">
             <div class="w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors duration-300"
                  :class="[
                     step.id === currentStep ? 'bg-blue-600 text-white shadow-md ring-4 ring-blue-100' : 
                     step.id < currentStep ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                  ]"
             >
                <svg v-if="step.id < currentStep" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                <span v-else>{{ step.id }}</span>
             </div>
             <div class="text-center absolute w-24 -bottom-8">
                 <p class="text-xs font-semibold" :class="step.id <= currentStep ? 'text-gray-900' : 'text-gray-400'">{{ step.name }}</p>
             </div>
          </div>
       </div>
    </div>
    
    <div class="w-full max-w-4xl bg-white rounded-lg shadow-sm font-sans border border-gray-200 p-8 pt-4 mt-6">
      
      <!-- MAIN FORM CONTAINER -->
      <form @submit.prevent>
        
        <Step1_GeneralInfo 
            v-show="currentStep === 1" 
            :previewUrl="previewUrl"
            :isThumbnailLoading="isThumbnailLoading"
            :ALL_EVENT_TARGET_AUDIENCE="ALL_EVENT_TARGET_AUDIENCE"
            :ALL_EVENT_TAGS="ALL_EVENT_TAGS"
            :errors="form.errors.value"
            @setThumbnail="setThumbnail"
            @removeImage="removeImage"
        />

        <Step2_SubSession 
            v-if="currentStep === 2"
            v-model="subSessions"
            :isSessionLoading="isSessionLoading"
            @removeSubSession="handleRemoveSubSession"
            @skip="handleSkip"
        />

        <Step3_SurveyForm 
            v-if="currentStep === 3"
            :eventId="props.id"
            :isEditMode="isEditMode"
            :isFormLoading="isFormLoading"
            :formsList="formStore.formsList"
            v-model:wantPreEventForm="wantPreEventForm"
            v-model:wantPostEventForm="wantPostEventForm"
            @createForm="(type) => props.id ? formStore.createInitialForm(props.id, type as FormType).then(r => router.push({ name: 'CreateForms', params: { id: props.id, formId: r.id } })) : null "
            @editForm="(formId) => router.push({ name: 'CreateForms', params: { id: props.id!, formId } })"
            @skip="handleSkip"
        />

        <Step4_Certificate 
            ref="step4Ref"
            v-show="currentStep === 4"
            :isCertificateLoading="isCertificateLoading"
            @skip="handleSkip"
        />

        <Step5_Preview 
            v-if="currentStep === 5"
            :formValues="form.values"
            :subSessions="subSessions"
            :wantPreEventForm="wantPreEventForm"
            :wantPostEventForm="wantPostEventForm"
            :hasCertificate="step4Ref?.hasCertificateConfig || false"
            :isSubmitting="isSubmitting"
            :previewUrl="previewUrl"
            :submitStatus="submitStatus"
            :isEditMode="isEditMode"
        />

        <!-- BOTTOM CONTROLS -->
        <div class="flex justify-between gap-4 pt-6 mt-8 border-t border-gray-100" v-if="!isSubmitting">
          <div>
            <Button type="button" variant="outline" @click="prevStep" v-if="currentStep > 1">
              Back
            </Button>
            <Button type="button" variant="outline" @click="onCancel" v-else>
              Cancel
            </Button>
          </div>
          <div>
            <Button type="button" v-if="currentStep < totalSteps" @click="nextStep" class="min-w-28 text-sm" id="next-btn">
                Next
            </Button>
            <Button type="button" v-if="currentStep === totalSteps" @click="nextStep" class="bg-green-600 hover:bg-green-700 min-w-28 text-sm flex items-center gap-2" id="confirm-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                {{ isEditMode ? 'Confirm Update' : 'Confirm Create' }}
            </Button>
          </div>
        </div>

      </form>
    </div>
    
  </div>
</template>