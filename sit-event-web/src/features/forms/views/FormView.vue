<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FormService, type EventFormResponse, FormType } from '../services/FormServices'
import { EventService } from '@/features/event_management/services/EventServices'
import SessionSelectionDialog from '@/features/registration/components/SessionSelectionDialog.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const eventId = route.params.id as string
const form = ref<EventFormResponse | null>(null)
const answers = ref<Record<string, string | string[]>>({})
const isSubmitting = ref(false)
const errors = ref<string[]>([])
const props = defineProps({
  isPreviewMode: {
    type: Boolean,
    default: false,
  },
})

// Dialog State
const isSessionDialogOpen = ref(false)
const sessionLoading = ref(false)
const availableSessions = ref<any[]>([])

onMounted(async () => {
  try {
    const type = route.query.type as FormType
    const res = await FormService.getFormForUser(eventId, type)

    const formData = Array.isArray(res) ? res[0] : res

    if (!formData) {
      toast.error('ไม่พบข้อมูลแบบฟอร์ม')
      return
    }

    if (formData.isActive === false && !props.isPreviewMode) {
      router.push({ name: 'FormClosed' })
      return
    }
    form.value = formData
    formData.fields.forEach((field) => {
      if (field.fieldType === 'CHECKBOX') {
        answers.value[field.id] = []
      } else {
        answers.value[field.id] = ''
      }
    })
  } catch (error: unknown) {
    //ทำ 409
    const err = error as { response?: { status?: number } }
    if (err.response?.status === 404) {
      toast.error('ไม่พบแบบฟอร์มสำหรับอีเวนต์นี้')
    }
  }
})

const validateForm = () => {
  if (!form.value) return false

  const newErrors: string[] = []
  let isValid = true

  for (const field of form.value.fields) {
    if (field.isRequired) {
      const currentAnswer = answers.value[field.id]
      const isEmpty = Array.isArray(currentAnswer)
        ? currentAnswer.length === 0
        : !currentAnswer || String(currentAnswer).trim() === ''

      if (isEmpty) {
        newErrors.push(field.id)
        toast.error(`กรุณากรอกข้อมูลในช่อง: ${field.question}`)
        isValid = false
      }
    }
  }

  errors.value = newErrors
  return isValid
}

watch(
  answers,
  () => {
    if (errors.value.length > 0) {
      errors.value = errors.value.filter((fieldId) => {
        const currentAnswer = answers.value[fieldId]
        return Array.isArray(currentAnswer)
          ? currentAnswer.length === 0
          : !currentAnswer || String(currentAnswer).trim() === ''
      })
    }
  },
  { deep: true },
)

const handleSubmit = async () => {
  //ทำ 403
  if (props.isPreviewMode) return
  if (!validateForm() || !form.value) return

  isSubmitting.value = true

  try {
    const payload = {
      answers: Object.entries(answers.value).map(([fieldId, answer]) => {
        // ตรวจสอบว่าเป็น Checkbox (Array) หรือไม่
        // ถ้าเป็น Array ให้ join ด้วย ", " เพื่อส่งเป็น String ชุดเดียว
        const formattedAnswer = Array.isArray(answer) ? answer.join(', ') : String(answer)

        return {
          fieldId,
          answer: formattedAnswer,
        }
      }),
    }

    // Check if Pre-Event Form
    const type = route.query.type as FormType
    if (type === FormType.PRE_EVENT) {
      // 1. ลงทะเบียน Event ก่อน
      await EventService.registerForEvent(eventId, { sessionId: '' })

      // 2. Submit Form
      await FormService.submitForm(eventId, form.value.id, payload)
      toast.success('ส่งแบบฟอร์มและลงทะเบียนสำเร็จ!')

      // 3. Load Sessions to check if we need to show select dialog
      const sessions = await EventService.getEventSessions(eventId)
      if (sessions && sessions.length > 0) {
        availableSessions.value = sessions
        // Filter out auto-register sessions? User said: "if there are sub-session that is not auto register..."
        // In backend, auto-register = true means already registered.
        // We should show sessions that are NOT auto-register (optional/manual selection)
        availableSessions.value = sessions.filter((s) => !s.autoRegister)

        if (availableSessions.value.length > 0) {
          isSessionDialogOpen.value = true
          // Stop here, wait for dialog
          isSubmitting.value = false
          return
        }
      }
    } else {
      // Post Event or others: Submit Form directly
      await FormService.submitForm(eventId, form.value.id, payload)
      toast.success('ส่งแบบฟอร์มสำเร็จ!')
    }

    router.push({ name: 'Home' })
  } catch (error: any) {
    const status = error.response?.status || error.status

    if (status === 409) {
      toast.error('คุณได้ส่งแบบฟอร์มนี้ไปแล้ว')
    } else if (status === 403) {
      // Pre-event form logic changes error handling slightly?
      // If we register first, 403 might mean something else.
      // But standard error handling is fine.
      toast.error('คุณไม่ได้เข้าร่วมอีเวนต์นี้ จึงไม่สามารถส่งแบบฟอร์มได้')
    } else {
      toast.error('เกิดข้อผิดพลาดในการส่งฟอร์ม')
    }
  } finally {
    if (!isSessionDialogOpen.value) {
      isSubmitting.value = false
    }
  }
}

const onConfirmSessionSelection = async (sessionIds: string[]) => {
  sessionLoading.value = true
  try {
    const promises = sessionIds.map((sessionId) =>
      EventService.registerForSession(eventId, sessionId),
    )
    await Promise.all(promises)
    toast.success('ลงทะเบียน Sub-session เรียบร้อยแล้ว')
    isSessionDialogOpen.value = false
    router.push({ name: 'Home' })
  } catch (err: any) {
    console.error(err)
    toast.error('การลงทะเบียน Session ล้มเหลว')
  } finally {
    sessionLoading.value = false
  }
}

const onBackFromSession = () => {
  // User already registered for main event, just close dialog and go home
  isSessionDialogOpen.value = false
  router.push({ name: 'Home' })
}

// ฟังก์ชันสำหรับสร้าง Writable Computed เพื่อจัดการ string โดยเฉพาะ
const getTextValue = (fieldId: string) => {
  return computed({
    get: () => (answers.value[fieldId] as string) || '',
    set: (val: string) => {
      answers.value[fieldId] = val
    },
  })
}
</script>

<template>
  <div v-if="form" class="max-w-3xl mx-auto p-6 space-y-5 bg-slate-50/30 min-h-screen">
    <Card class="border-t-5 border-t-black shadow-sm">
      <CardHeader class="p-8 py-5">
        <CardTitle class="text-3xl font-bold">{{ form.title }}</CardTitle>
        <p v-if="form.description" class="text-slate-600 mt-2 text-md">
          {{ form.description }}
        </p>
      </CardHeader>
    </Card>

    <div v-for="field in form.fields" :key="field.id">
      <Card
        class="shadow-sm transition-all hover:shadow-md border-2"
        :class="errors.includes(field.id) ? 'border-red-500 bg-red-50/10' : 'border-slate-200'"
      >
        <CardContent class="p-8 py-5 space-y-5">
          <Label
            class="text-md font-medium leading-relaxed block"
            :class="{ 'text-red-600': errors.includes(field.id) }"
          >
            {{ field.question }}
            <span v-if="field.isRequired" class="text-red-500 ml-1 text-xl">*</span>
          </Label>

          <div v-if="field.fieldType === 'TEXT'">
            <Input
              v-model="getTextValue(field.id).value"
              placeholder="คำตอบของคุณ"
              class="border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-black px-0 bg-transparent text-base shadow-none transition-colors"
              :class="errors.includes(field.id) ? 'border-red-400' : 'border-slate-200'"
            />
          </div>

          <RadioGroup
            v-if="field.fieldType === 'RADIO'"
            v-model="answers[field.id]"
            class="space-y-3"
          >
            <div
              v-for="opt in field.options"
              :key="opt"
              class="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50"
            >
              <RadioGroupItem :value="opt" :id="field.id + opt" class="w-5 h-5" />
              <Label :for="field.id + opt" class="text-sm font-normal cursor-pointer flex-1">{{
                opt
              }}</Label>
            </div>
          </RadioGroup>

          <div v-if="field.fieldType === 'CHECKBOX'" class="space-y-3">
            <div
              v-for="opt in field.options"
              :key="opt"
              class="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50"
            >
              <input
                :id="field.id + opt"
                type="checkbox"
                :checked="(answers[field.id] as string[]).includes(opt)"
                @change="
                  (e) => {
                    const checked = (e.target as HTMLInputElement).checked
                    const current = answers[field.id] as string[]
                    answers[field.id] = checked
                      ? [...current, opt]
                      : current.filter((i) => i !== opt)
                  }
                "
              />
              <Label :for="field.id + opt" class="text-sm font-normal cursor-pointer flex-1">{{
                opt
              }}</Label>
            </div>
          </div>

          <div v-if="field.fieldType === 'RATING_SCALE'" class="flex flex-col gap-4">
            <div class="flex justify-between items-center px-2">
              <span class="text-sm font-medium text-slate-500">น้อยที่สุด</span>
              <RadioGroup v-model="answers[field.id]" class="flex gap-4 md:gap-8">
                <div v-for="n in 5" :key="n" class="flex flex-col items-center gap-2">
                  <Label :for="field.id + n" class="text-sm">{{ n }}</Label>
                  <RadioGroupItem :value="String(n)" :id="field.id + n" />
                </div>
              </RadioGroup>
              <span class="text-sm font-medium text-slate-500">มากที่สุด</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="flex justify-between items-center pt-2">
      <Button variant="ghost" class="text-black" @click="router.back()">ยกเลิก</Button>
      <Button
        @click="handleSubmit"
        :disabled="isSubmitting"
        class="bg-black hover:bg-gray-800 px-7 py-5 text-md rounded-lg shadow-lg transition-all active:scale-95"
      >
        <span v-if="isSubmitting">กำลังดำเนินการ...</span>
        <span v-else>{{ route.query.type === FormType.PRE_EVENT ? 'ลงทะเบียน' : 'ส่ง' }}</span>
      </Button>
    </div>

    <SessionSelectionDialog
      v-model:open="isSessionDialogOpen"
      :sessions="availableSessions"
      :isLoading="sessionLoading"
      @confirm="onConfirmSessionSelection"
      @back="onBackFromSession"
    />
  </div>
</template>
