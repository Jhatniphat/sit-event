import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { FormService } from '../services/FormServices'
import type {
  FormFieldPayload,
  CreateEventFormDto,
  FormFieldResponse,
  EventFormResponse,
} from '../services/FormServices'

// ประเภทคำถามตาม Swagger Enum
export type QuestionType = 'SHORT_ANSWER' | 'RATING_SCALE' | 'CHECKBOX' | 'RADIO'

interface Question {
  id: number | string
  title: string
  type: QuestionType
  options: string[]
  required: boolean
}

export const useFormStore = defineStore('form', () => {
  // --- State ---
  const questions = ref<Question[]>([])
  const formTitle = ref<string>('')
  const formDescription = ref<string>('')
  const isLoading = ref<boolean>(false)
  const currentFormId = ref<string | null>(null)

  // --- Getters ---
  const questionTypes = computed(() => [
    { label: 'Short Answer', value: 'SHORT_ANSWER' as QuestionType },
    { label: 'Radio', value: 'RADIO' as QuestionType },
    { label: 'Checkboxes', value: 'CHECKBOX' as QuestionType },
    { label: 'Rating Scale', value: 'RATING_SCALE' as QuestionType },
  ])

  const addQuestion = () => {
    questions.value.push({
      id: Date.now(),
      title: '',
      type: 'RADIO',
      options: ['Option 1'],
      required: false,
    })
  }

  const removeQuestion = (index: number) => {
    if (questions.value.length > 1) questions.value.splice(index, 1)
  }

  const addOption = (qIdx: number) => {
    const q = questions.value[qIdx]
    if (q) q.options.push(`Option ${q.options.length + 1}`)
  }

  const removeOption = (qIdx: number, optIdx: number) => {
    const q = questions.value[qIdx]
    if (q && q.options.length > 1) q.options.splice(optIdx, 1)
  }

  // --- Service Actions ---

  /**
   * สำหรับเรียกจาก Dashboard: สร้างฟอร์มเปล่าเพื่อเอา formId
   */
  const createInitialForm = async (eventId: string): Promise<EventFormResponse> => {
    isLoading.value = true
    try {
      const createDto: CreateEventFormDto = {
        title: 'Form Title',
        description: '',
      }
      const formRes = await FormService.createForm(eventId, createDto)
      currentFormId.value = formRes.id
      return formRes
    } catch (error) {
      console.error('Create initial form failed:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * ดึงข้อมูลฟอร์ม (GET /events/{eventId}/forms)
   */
  const fetchForm = async (eventId: string) => {
    isLoading.value = true
    currentFormId.value = null
    questions.value = []
    formTitle.value = ''
    formDescription.value = ''

    try {
      const res = await FormService.getFormForUser(eventId)

      // --- จุดสำคัญ 2: เช็คว่ามีข้อมูลตอบกลับมาจริงๆ (ไม่ใช่ null หรือ undefined) ---
      if (res && res.id) {
        currentFormId.value = res.id
        formTitle.value = res.title || ''
        formDescription.value = res.description || ''

        if (res.fields && Array.isArray(res.fields)) {
          questions.value = res.fields.map((f: FormFieldResponse) => ({
            id: f.id,
            title: f.question,
            type: (f.fieldType as QuestionType) || 'SHORT_ANSWER',
            required: f.isRequired ?? false,
            options: Array.isArray(f.options) ? f.options : [],
          }))
        }
      } else {
        console.log('No form found for this event, state has been cleared.')
      }
    } catch (error) {
      console.error('Fetch form failed:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * บันทึกข้อมูลที่แก้ไข (PATCH Form + POST Fields)
   */
  const saveFullForm = async (eventId: string): Promise<boolean> => {
    if (!currentFormId.value) return false
    isLoading.value = true
    console.log('Saving form with eventID:', eventId)
    try {
      // 1. Update Title & Description
      await FormService.updateForm(eventId, currentFormId.value, {
        title: formTitle.value,
        description: formDescription.value,
      })

      // 2. เตรียม Fields
      const fieldsPayload: FormFieldPayload[] = questions.value.map((q, index) => ({
        question: q.title || 'Question Title',
        fieldType: q.type,
        isRequired: q.required,
        order: index + 1,
        options: ['RADIO', 'CHECKBOX'].includes(q.type) ? q.options : [],
      }))

      // 3. บันทึก Fields แบบ Bulk (ตาม Swagger POST /fields)
      await FormService.addFields(eventId, currentFormId.value, fieldsPayload)

      return true
    } catch (error) {
      console.error('Save failed:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    questions,
    formTitle,
    formDescription,
    isLoading,
    currentFormId,
    questionTypes,
    addQuestion,
    removeQuestion,
    addOption,
    removeOption,
    createInitialForm,
    fetchForm,
    saveFullForm,
  }
})
