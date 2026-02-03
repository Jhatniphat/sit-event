<script setup lang="ts">
import { Plus, Trash2, Eye, GripVertical } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import draggable from 'vuedraggable'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useRoute, useRouter } from 'vue-router'
import { useFormStore } from '../store/FormStore'
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'

const router = useRouter()
const route = useRoute()
const formStore = useFormStore()
const eventId = route.params.id as string
const initialData = ref('')

onMounted(async () => {
  const formId = route.params.formId as string
  if (formId) {
    await formStore.loadForm(eventId, formId)
  }

  initialData.value = JSON.stringify({
    title: formStore.formTitle,
    description: formStore.formDescription,
    isActive: formStore.formIsActive,
    questions: formStore.questions,
    deletedIds: formStore.deletedFieldIds,
  })
})

const isDirty = computed(() => {
  const currentData = JSON.stringify({
    title: formStore.formTitle,
    description: formStore.formDescription,
    isActive: formStore.formIsActive,
    questions: formStore.questions,
    deletedIds: formStore.deletedFieldIds,
  })
  return currentData !== initialData.value
})

const onCancel = () => {
  router.back()
}

const onSubmit = async () => {
  if (!validateForm()) {
    return
  }
  try {
    const success = await formStore.saveFullForm(eventId)
    router.back()
    if (success) {
      toast.success('บันทึกฟอร์มสำเร็จ', {
        description: 'คุณได้บันทึกการเปลี่ยนแปลงของฟอร์มเรียบร้อยแล้ว',
      })
    } else {
      toast.error('บันทึกฟอร์มล้มเหลว', {
        description: 'ไม่สามารถบันทึกฟอร์มได้ในขณะนี้ กรุณาลองใหม่ภายหลัง',
      })
    }
  } catch (error: any) {
    console.error('Error during form deletion:', error)
    const errorMessage =
      error.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์'
    toast.error('บันทึกฟอร์มล้มเหลว', {
      description: errorMessage,
    })
  }
}

const handleViewForm = () => {
  router.push({
    name: 'FormView',
    params: { id: eventId },
    query: { preview: 'true' },
  })
}

const formErrors = ref<{
  title?: string
  questions: Record<number, string>
}>({ questions: {} })

const validateForm = () => {
  let isValid = true
  formErrors.value = { questions: {} }
  const errorMessages: string[] = []

  if (!formStore.formTitle.trim()) {
    const msg = 'กรุณากรอกหัวข้อฟอร์ม'
    formErrors.value.title = msg
    errorMessages.push(msg)
    isValid = false
  }

  formStore.questions.forEach((q, index) => {
    if (!q.title.trim()) {
      const msg = `กรุณากรอกหัวข้อคำถามที่ ${index + 1}`
      formErrors.value.questions[index] = 'กรุณากรอกคำถาม'
      errorMessages.push(msg)
      isValid = false
    }

    if ((q.type === 'RADIO' || q.type === 'CHECKBOX') && q.options.length === 0) {
      const msg = `คำถามที่ ${index + 1} ต้องมีอย่างน้อย 1 ตัวเลือก`
      errorMessages.push(msg)
      isValid = false
    }
  })

  if (errorMessages.length > 0) {
    toast.error('ข้อมูลไม่ครบถ้วน', {
      description: errorMessages[0],
    })
  }
  console.log('Form validation result:', isValid, formErrors.value)

  return isValid
}
</script>

<template>
  <div class="min-h-screen bg-slate-50/50 p-6 flex justify-center items-start gap-4">
    <div class="w-full max-w-3xl flex flex-col gap-4">
      <Card class="shadow-sm overflow-hidden">
        <CardContent class="px-8 pt-4 pb-1">
          <Input
            v-model="formStore.formTitle"
            variant="ghost"
            placeholder="Form Title"
            class="!text-3xl font-normal py-4 border-0 border-b-2 focus-visible:border-black focus-visible:border-b-2 focus-visible:ring-0 rounded-none px-0 mb-1 shadow-none"
            :class="{ 'border-b-red-500': formErrors.title }"
          />
          <p v-if="formErrors.title" class="text-xs text-red-500">
            {{ formErrors.title }}
          </p>
          <Input
            v-model="formStore.formDescription"
            variant="ghost"
            placeholder="Description (Not required)"
            class="text-sm border-0 border-b mt-4 focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-black rounded-none px-0 h-auto shadow-none"
          />
          <Separator class="mt-6" />
          <div class="flex justify-between items-start mt-6">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <div
                  :class="formStore.formIsActive ? 'bg-green-500' : 'bg-slate-400'"
                  class="w-2 h-2 rounded-full"
                ></div>
                <span
                  class="text-xs font-bold uppercase tracking-wider"
                  :class="formStore.formIsActive ? 'text-green-600' : 'text-slate-500'"
                >
                  {{ formStore.formIsActive ? 'Form Active' : 'Form Inactive' }}
                </span>
              </div>
              <p class="text-[11px] text-slate-400">Control participant access to the form.</p>
            </div>

            <div
              class="flex items-center gap-3 bg-slate-100 p-1.5 px-3 rounded-full border border-slate-200"
            >
              <Label :for="'form-status'" class="text-xs font-medium cursor-pointer">
                {{ formStore.formIsActive ? 'Accepting Responses' : 'Closed' }}
              </Label>
              <Switch id="form-status" v-model="formStore.formIsActive" />
            </div>
          </div>
        </CardContent>
      </Card>

      <draggable
        v-model="formStore.questions"
        item-key="id"
        handle=".drag-handle"
        :animation="200"
        ghost-class="opacity-50"
        class="flex flex-col gap-4"
      >
        <template #item="{ element: q, index }">
          <div class="group relative">
            <div
              class="drag-handle absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing bg-white border border-slate-200 rounded-md p-1 px-2 z-10 shadow-sm transition-all hover:bg-slate-50"
            >
              <GripVertical class="w-4 h-4 text-slate-400" />
            </div>

            <Card
              class="shadow-sm border-l-4 border-l-transparent focus-within:border-l-black transition-all"
              :class="formErrors.questions[index] ? 'border-l-red-500' : 'border-l-transparent'"
            >
              <CardContent class="p-6">
                <div class="flex flex-col md:flex-row gap-4">
                  <div class="flex-1">
                    <Input
                      v-model="q.title"
                      placeholder="Question Title"
                      class="bg-slate-50 border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:bg-slate-100 transition-all h-12"
                      :class="{ 'border-b-red-500': formErrors.questions[index] }"
                    />
                  </div>

                  <Select v-model="q.type">
                    <SelectTrigger class="w-full md:w-[200px] h-12">
                      <SelectValue placeholder="Question Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Short Answer</SelectItem>
                      <SelectItem value="RADIO">Radio</SelectItem>
                      <SelectItem value="CHECKBOX">Checkboxes</SelectItem>
                      <SelectItem value="RATING_SCALE">Rating Scale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p v-if="formErrors.questions[index]" class="text-xs text-red-500 mt-1">
                  {{ formErrors.questions[index] }}
                </p>
                <div class="min-h-[60px] mt-6">
                  <div
                    v-if="q.type === 'TEXT'"
                    class="w-3/5 border-b border-dashed border-slate-300 py-2 text-slate-400 text-sm"
                  >
                    Short Answer
                  </div>

                  <div
                    v-if="q.type === 'RADIO' || q.type === 'CHECKBOX'"
                    class="flex flex-col gap-3"
                  >
                    <div
                      v-for="(opt, optIdx) in q.options"
                      :key="optIdx"
                      class="flex items-center gap-3 group/option"
                    >
                      <div
                        v-if="q.type === 'RADIO'"
                        class="w-5 h-5 border-2 border-slate-300 rounded-full"
                      />
                      <div v-else class="w-5 h-5 border-2 border-slate-300 rounded" />
                      <Input
                        v-model="q.options[optIdx]"
                        class="border-0 focus-visible:ring-0 focus-visible:border-b rounded-none h-8 px-0"
                      />
                      <div v-if="q.options.length > 1">
                        <Button
                          variant="ghost"
                          size="icon"
                          @click="formStore.removeOption(index, Number(optIdx))"
                          class="text-slate-500 hover:text-red-600"
                        >
                          <Trash2 class="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="w-fit text-slate-500 font-normal"
                      @click="formStore.addOption(index)"
                    >
                      Add Option
                    </Button>
                  </div>

                  <div v-if="q.type === 'RATING_SCALE'" class="flex items-center gap-4 py-4">
                    <div class="flex flex-row w-full justify-between items-center">
                      <span class="text-sm font-medium text-slate-500">น้อยที่สุด</span>
                      <RadioGroup class="flex gap-4 md:gap-8" :disabled="true">
                        <div v-for="n in 5" :key="n" class="flex flex-col items-center gap-2">
                          <Label class="text-sm text-black">{{ n }}</Label>
                          <RadioGroupItem :value="String(n)" />
                        </div>
                      </RadioGroup>
                      <span class="text-sm font-medium text-slate-500">มากที่สุด</span>
                    </div>
                  </div>
                </div>

                <Separator class="my-6" />

                <div class="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    @click="formStore.removeQuestion(index)"
                    :disabled="formStore.questions.length <= 1"
                    class="text-slate-500 hover:text-red-600"
                  >
                    <Trash2 class="h-5 w-5" />
                  </Button>

                  <div class="h-6 w-px bg-slate-200 mx-2" />

                  <div class="flex items-center space-x-2">
                    <Label :for="'req-' + q.id" class="text-sm font-normal text-slate-600"
                      >Required</Label
                    >
                    <Switch :id="'req-' + q.id" v-model="q.isRequired" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </template>
      </draggable>

      <div>
        <div class="flex flex-row justify-end gap-3 pt-4 text-gray-800">
          <Button type="button" variant="outline" @click="onCancel">Cancel</Button
          ><Button type="submit" @click="onSubmit" :disabled="!isDirty || formStore.isLoading"
            >Save</Button
          >
        </div>
      </div>
    </div>

    <Card class="sticky top-6 p-1 flex flex-col gap-1 shadow-md border-slate-200 h-fit">
      <Button
        variant="ghost"
        size="icon"
        @click="formStore.addQuestion"
        class="rounded-full h-12 w-12"
        title="Add Question"
      >
        <Plus class="h-6 w-6 text-slate-600" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="rounded-full h-12 w-12"
        title="Preview"
        @click="handleViewForm()"
      >
        <Eye class="h-6 w-6 text-slate-600" />
      </Button>
    </Card>
  </div>
</template>

<style scoped>
/* ลบเส้นโฟกัสพื้นฐานของ Input ในบางกรณี */
:deep(.border-0:focus-visible) {
  outline: none;
  box-shadow: none;
}
</style>
