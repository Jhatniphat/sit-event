import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { FormService } from '../services/FormServices'
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
  const isLoading = ref<boolean>(false)
  const currentFormId = ref<string | null>(null)
  const deletedFieldIds = ref<string[]>([])

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

  const fetchForm = async (eventId: string) => {
    isLoading.value = true
    // ล้างค่าเก่าก่อน fetch ใหม่เสมอเพื่อป้องกันข้อมูล event เดิมค้าง
    currentFormId.value = null
    questions.value = []
    formTitle.value = ''
    formDescription.value = ''

    try {
      const res = await FormService.getFormForUser(eventId)
      if (res && res.id) {
        currentFormId.value = res.id
        formTitle.value = res.title || ''
        formDescription.value = res.description || ''
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

  const saveFullForm = async (eventId: string): Promise<boolean> => {
    if (!currentFormId.value) return false
    isLoading.value = true
    try {
      // 1. จัดการลบคำถามที่ถูกเอาออก (Bulk Delete)
      if (deletedFieldIds.value.length > 0) {
        await FormService.deleteFields(eventId, currentFormId.value, {
          fieldIds: deletedFieldIds.value,
        })
        deletedFieldIds.value = [] // ล้างคลังเมื่อลบสำเร็จ
      }

      // 2. อัปเดตข้อมูลหัวฟอร์ม (PATCH Form)
      await FormService.updateForm(eventId, currentFormId.value, {
        title: formTitle.value,
        description: formDescription.value,
      })

      // 3. จัดการคำถาม (แยก Update และ Create)
      // แบ่งคำถามออกเป็น 2 กลุ่ม

      const existingFields = questions.value.filter((q) => typeof q.id === 'string')
      const newFields = questions.value.filter((q) => typeof q.id !== 'string')

      // 3.1 อัปเดตคำถามที่มีอยู่เดิม (PATCH ทีละฟิลด์)
      if (existingFields.length > 0) {
        const updatePromises = existingFields.map((q, index) =>
          FormService.updateField(eventId, currentFormId.value!, String(q.id), {
            question: q.title || 'Untitled Question',
            fieldType: q.type,
            isRequired: q.isRequired,
            order: index + 1, // เรียงลำดับใหม่ตาม UI ปัจจุบัน
            options: ['RADIO', 'CHECKBOX'].includes(q.type) ? q.options : [],
          }),
        )
        console.log('Updating existing fields:', existingFields)
        await Promise.all(updatePromises)
      }

      // 3.2 เพิ่มคำถามใหม่ที่เพิ่งสร้างใน UI (POST Bulk)
      if (newFields.length > 0) {
        const newFieldsPayload: FormFieldPayload[] = newFields.map((q, index) => ({
          question: q.title || 'Untitled Question',
          fieldType: q.type,
          isRequired: q.isRequired,
          order: existingFields.length + index + 1, // ต่อท้ายลำดับเดิม
          options: ['RADIO', 'CHECKBOX'].includes(q.type) ? q.options : [],
        }))
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
      resetForm() // ลบสำเร็จแล้วล้าง state ทันทีเพื่อให้ UI สลับไปหน้าสร้างใหม่
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
    isLoading,
    currentFormId,
    questionTypes,
    deletedFieldIds,
    resetForm,
    addQuestion,
    removeQuestion,
    addOption,
    removeOption,
    createInitialForm,
    fetchForm,
    saveFullForm,
    deleteForm,
  }
})
