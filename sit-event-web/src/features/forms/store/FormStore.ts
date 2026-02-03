import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { FormService, FormType } from '../services/FormServices'
import type {
  FormFieldPayload,
  CreateEventFormDto,
  FormFieldResponse,
  EventFormResponse,
} from '../services/FormServices'
import { toast } from 'vue-sonner'

export type QuestionType = 'TEXT' | 'RATING_SCALE' | 'CHECKBOX' | 'RADIO'

interface Question {
  id: number | string
  title: string
  type: QuestionType
  options: string[]
  isRequired: boolean
}

export const useFormStore = defineStore('form', () => {
  // --- State ---
  const questions = ref<Question[]>([])
  const formTitle = ref<string>('')
  const formDescription = ref<string>('')
  const formIsActive = ref<boolean>(false)
  const isLoading = ref<boolean>(false)
  const currentFormId = ref<string | null>(null)
  const deletedFieldIds = ref<string[]>([])
  const formsList = ref<EventFormResponse[]>([])

  // --- Getters ---
  const questionTypes = computed(() => [
    { label: 'Short Answer', value: 'TEXT' as QuestionType },
    { label: 'Multiple Choice', value: 'RADIO' as QuestionType },
    { label: 'Checkboxes', value: 'CHECKBOX' as QuestionType },
    { label: 'Rating Scale', value: 'RATING_SCALE' as QuestionType },
  ])

  // --- Actions ---
  const resetForm = () => {
    questions.value = []
    formTitle.value = ''
    deletedFieldIds.value = []
    formDescription.value = ''

    currentFormId.value = null
    isLoading.value = false
  }

  const addQuestion = () => {
    questions.value.push({
      id: Date.now(),
      title: '',
      type: 'RADIO',
      options: ['Option 1'],
      isRequired: false,
    })
  }

  const removeQuestion = (index: number) => {
    if (questions.value.length > 1) {
      const questionToDelete = questions.value[index]
      if (questionToDelete && typeof questionToDelete.id === 'string') {
        deletedFieldIds.value.push(questionToDelete.id)
      }

      questions.value.splice(index, 1)
    } else {
      toast.error('ต้องมีคำถามอย่างน้อย 1 ข้อในแบบฟอร์ม')
    }
  }

  const addOption = (qIdx: number) => {
    const q = questions.value[qIdx]
    if (q) q.options.push(`Option ${q.options.length + 1}`)
  }

  const removeOption = (qIdx: number, optIdx: number) => {
    const q = questions.value[qIdx]
    if (q && q.options.length > 1) {
      q.options.splice(optIdx, 1)
    }
  }

  // --- Service Actions (API) ---
  const createInitialForm = async (eventId: string, type: FormType = FormType.POST_EVENT): Promise<EventFormResponse> => {
    isLoading.value = true
    try {
      const createDto: CreateEventFormDto = {
        title: type === FormType.PRE_EVENT ? 'Pre-Event Form' : 'Post-Event Form',
        description: '',
        isActive: false,
        type: type,
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

  const fetchForms = async (eventId: string) => {
      isLoading.value = true
      try {
        const res = await FormService.getForms(eventId)
        formsList.value = res
      } catch (error) {
        console.error('Fetch forms failed:', error)
      } finally {
        isLoading.value = false
      }
  }

  const loadForm = async (eventId: string, formId: string) => {
    isLoading.value = true
    currentFormId.value = null
    questions.value = []
    formTitle.value = ''
    formDescription.value = ''
    formIsActive.value = false

    try {
      const res = await FormService.getFormById(eventId, formId)
      if (res && res.id) {
        currentFormId.value = res.id
        formTitle.value = res.title || ''
        formDescription.value = res.description || ''
        formIsActive.value = res.isActive || false
        if (res.fields && Array.isArray(res.fields)) {
          questions.value = res.fields.map((f: FormFieldResponse) => ({
            id: f.id,
            title: f.question,
            type: (f.fieldType as QuestionType) || 'TEXT',
            isRequired: f.isRequired ?? false,
            options: Array.isArray(f.options) ? f.options : [],
          }))
        }
      }
    } catch (error) {
      console.error('Fetch form failed:', error)
    } finally {
      isLoading.value = false
    }
  }

  // Deprecated: use loadForm and fetchForms
  const fetchForm = async (eventId: string) => {
    // Legacy support or remove? keeping for finding bugs
    // Assuming retrieving all forms and picking first? Or just failing?
    // Let's redirect to fetchForms logic if possible, but this functin signature was (eventId).
    // Better to change usages.
    console.warn('fetchForm is deprecated. Use loadForm or fetchForms') 
    isLoading.value = false
  }

  const saveFullForm = async (eventId: string): Promise<boolean> => {
    if (!currentFormId.value) return false
    isLoading.value = true
    try {
      if (deletedFieldIds.value.length > 0) {
        await FormService.deleteFields(eventId, currentFormId.value, {
          fieldIds: deletedFieldIds.value,
        })
        deletedFieldIds.value = []
      }
      await FormService.updateForm(eventId, currentFormId.value, {
        title: formTitle.value,
        description: formDescription.value,
        isActive: formIsActive.value,
      })

      // เตรียมคำถามโดยการ "คำนวณ Order ใหม่" จากลำดับใน Array
      // เราจะใช้ index + 1 เพื่อให้ลำดับรันต่อเนื่อง 1, 2, 3...

      const existingFields = questions.value.filter((q) => typeof q.id === 'string')
      const newFields = questions.value.filter((q) => typeof q.id !== 'string')

      // อัปเดตคำถามที่มีอยู่เดิม (PATCH ทีละฟิลด์)
      if (existingFields.length > 0) {
        const updatePromises = existingFields.map((q) => {
          const currentOrder = questions.value.findIndex((item) => item.id === q.id) + 1

          return FormService.updateField(eventId, currentFormId.value!, String(q.id), {
            question: q.title || 'Untitled Question',
            fieldType: q.type,
            isRequired: q.isRequired,
            order: currentOrder,
            options: ['RADIO', 'CHECKBOX'].includes(q.type) ? q.options : [],
          })
        })
        console.log('Updating existing fields:', existingFields)
        await Promise.all(updatePromises)
      }

      // เพิ่มคำถามใหม่ที่เพิ่งสร้างใน UI (POST Bulk)
      if (newFields.length > 0) {
        const newFieldsPayload: FormFieldPayload[] = newFields.map((q) => {
          const currentOrder = questions.value.findIndex((item) => item.id === q.id) + 1

          return {
            question: q.title || 'Untitled Question',
            fieldType: q.type,
            isRequired: q.isRequired,
            order: currentOrder,
            options: ['RADIO', 'CHECKBOX'].includes(q.type) ? q.options : [],
          }
        })
        console.log('Adding new fields:', newFieldsPayload)
        await FormService.addFields(eventId, currentFormId.value, newFieldsPayload)
      }

      // หลังบันทึกเสร็จ ควร fetch ใหม่เพื่อให้ได้ ID จริงจาก DB มาแทนที่ ID ชั่วคราว (Date.now())
      await fetchForm(eventId)

      return true
    } catch (error) {
      console.error('Save failed:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const deleteForm = async (eventId: string, formId: string) => {
    isLoading.value = true
    try {
      await FormService.deleteForm(eventId, formId)
      return true
    } catch (error) {
      console.error('Delete form failed:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    questions,
    formTitle,
    formDescription,
    formIsActive,
    isLoading,
    currentFormId,
    formsList,
    questionTypes,
    deletedFieldIds,
    resetForm,
    addQuestion,
    removeQuestion,
    addOption,
    removeOption,
    createInitialForm,
    fetchForm,
    fetchForms,
    loadForm,
    saveFullForm,
    deleteForm,
  }
})

