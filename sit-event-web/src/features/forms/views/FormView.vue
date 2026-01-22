<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FormService, type EventFormResponse } from '../services/FormServices'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const eventId = route.params.id as string
const form = ref<EventFormResponse | null>(null)
const answers = ref<Record<string, string | string[]>>({})
const isSubmitting = ref(false)
const isAdminOrOrganizer = computed(() => {
  const role = authStore.user?.userRole
  return role === 'Organizer' || role === 'Admin' || role === 'ADMIN' || role === 'ORGANIZER'
})

onMounted(async () => {
  try {
    const res = await FormService.getFormForUser(eventId)
    form.value = res

    // ตั้งค่าเริ่มต้นตามประเภทคำถาม
    res.fields.forEach((field) => {
      if (field.fieldType === 'CHECKBOX') {
        answers.value[field.id] = []
      } else {
        answers.value[field.id] = ''
      }
    })
  } catch (error: unknown) {
    // จัดการ error แบบระบุประเภท
    const err = error as { response?: { status?: number } }
    if (err.response?.status === 404) {
      toast.error('ไม่พบแบบฟอร์มสำหรับอีเวนต์นี้')
    }
  }
})

// ฟังก์ชันเช็คว่ากรอกครบตามเงื่อนไข isRequired หรือยัง
const validateForm = () => {
  if (!form.value) return false

  for (const field of form.value.fields) {
    if (field.isRequired) {
      const currentAnswer = answers.value[field.id]

      const isEmpty = Array.isArray(currentAnswer)
        ? currentAnswer.length === 0
        : !currentAnswer || currentAnswer.trim() === ''

      if (isEmpty) {
        toast.error(`กรุณากรอกข้อมูลในช่อง: ${field.question}`)
        return false
      }
    }
  }
  return true
}

const handleSubmit = async () => {
  if (!validateForm() || !form.value) return

  isSubmitting.value = true

  try {
    const payload = {
      answers: Object.entries(answers.value).map(([fieldId, answer]) => ({
        fieldId,
        // สำหรับ SubmitPayload เราส่งเป็น string หรือ string[] ตามประเภท field นั้นๆ
        answer: Array.isArray(answer) ? answer : String(answer),
      })),
    }

    await FormService.submitForm(eventId, form.value.id, payload)
    toast.success('ส่งแบบฟอร์มสำเร็จ!')
    router.push({ name: 'EventDetail', params: { id: eventId } })
  } catch (error: unknown) {
    const err = error as { response?: { status?: number } }
    if (err.response?.status === 409) {
      toast.error('คุณได้ส่งแบบฟอร์มนี้ไปแล้ว')
    } else {
      toast.error('เกิดข้อผิดพลาดในการส่งฟอร์ม')
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="form" class="max-w-3xl mx-auto p-6 space-y-5 bg-slate-50/30 min-h-screen">
    <Card class="border-t-5 border-t-black shadow-sm">
      <CardHeader class="p-8 py-5">
        <CardTitle class="text-3xl font-bold">{{ form.title }}</CardTitle>
        <p class="text-slate-600 mt-2 text-md">
          {{ form.description || 'กรุณากรอกข้อมูลให้ครบถ้วน' }}
        </p>
      </CardHeader>
    </Card>

    <div v-for="field in form.fields" :key="field.id">
      <Card class="shadow-sm transition-all hover:shadow-md border-slate-200">
        <CardContent class="p-8 py-5 space-y-5">
          <Label class="text-md font-medium leading-relaxed block">
            {{ field.question }}
            <span v-if="field.isRequired" class="text-red-500 ml-1 text-xl">*</span>
          </Label>

          <div v-if="field.fieldType === 'TEXT'">
            <Input
              :disabled="isAdminOrOrganizer"
              :value="answers[field.id] as string"
              @input="(e: Event) => (answers[field.id] = (e.target as HTMLInputElement).value)"
              placeholder="คำตอบของคุณ"
              class="border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-black px-0 bg-transparent text-base"
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
              <RadioGroupItem
                :value="opt"
                :id="field.id + opt"
                class="w-5 h-5"
                :disabled="isAdminOrOrganizer"
              />
              <Label
                :for="field.id + opt"
                class="text-sm font-normal cursor-pointer flex-1"
                :class="{ 'text-slate-400': isAdminOrOrganizer }"
                >{{ opt }}</Label
              >
            </div>
          </RadioGroup>

          <div v-if="field.fieldType === 'CHECKBOX'" class="space-y-3">
            <div
              v-for="opt in field.options"
              :key="opt"
              class="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50"
            >
              <Checkbox
                :disabled="isAdminOrOrganizer"
                :id="field.id + opt"
                :checked="(answers[field.id] as string[]).includes(opt)"
                @update:checked="
                  (checked: boolean) => {
                    const currentAnswers = answers[field.id] as string[]
                    if (checked) {
                      answers[field.id] = [...currentAnswers, opt]
                    } else {
                      answers[field.id] = currentAnswers.filter((i: string) => i !== opt)
                    }
                  }
                "
              />
              <Label
                :for="field.id + opt"
                class="text-sm font-normal cursor-pointer flex-1"
                :class="{ 'text-slate-500': isAdminOrOrganizer }"
                >{{ opt }}</Label
              >
            </div>
          </div>

          <div v-if="field.fieldType === 'RATING_SCALE'" class="flex flex-col gap-4">
            <div class="flex justify-between items-center px-2">
              <span class="text-sm font-medium text-slate-500">น้อยที่สุด</span>
              <RadioGroup
                v-model="answers[field.id]"
                :disabled="isAdminOrOrganizer"
                class="flex gap-4 md:gap-8"
              >
                <div v-for="n in 5" :key="n" class="flex flex-col items-center gap-2">
                  <Label
                    :for="field.id + n"
                    class="text-sm"
                    :class="{ 'text-slate-500': isAdminOrOrganizer }"
                    >{{ n }}</Label
                  >
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
        :disabled="isSubmitting || isAdminOrOrganizer"
        class="bg-black hover:bg-gray-800 px-7 py-5 text-md rounded-lg shadow-lg transition-all active:scale-95"
      >
        <span v-if="isSubmitting">กำลังส่ง...</span>
        <span v-else>ส่ง</span>
      </Button>
    </div>
  </div>
</template>
