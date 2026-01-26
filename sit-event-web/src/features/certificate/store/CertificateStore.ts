import { defineStore } from 'pinia'
import { ref } from 'vue'
import { CertificateService, type CertificateTemplate, type CertificateElement } from '../services/CertificateService'

// Type สำหรับ Element ในฝั่ง Frontend (ที่ใช้ใน Canvas)
export interface FrontendCertificateElement {
  id: string // client-side uuid
  type: string
  label: string
  x: number
  y: number
  value?: string
  fontSize?: number
  fontFamily?: string
  color?: string
  fontWeight?: string
  textAlign?: string
  dateFormat?: string
  width?: number
  height?: number
  file?: File | null // for Image element upload
  src?: string | null // preview url
  isNew?: boolean // flag to check if it needs creation vs update (optional logic)
}

export const useCertificateStore = defineStore('certificate', () => {
  
  // --- State ---
  const currentTemplate = ref<CertificateTemplate | null>(null)
  const dbElements = ref<CertificateElement[]>([]) // Elements ที่โหลดมาจาก DB
  
  // Pending State (สิ่งที่ User แก้ไขใน Dialog)
  const pendingBackground = ref<File | null>(null)
  const pendingPreviewUrl = ref<string | null>(null)
  const pendingElements = ref<FrontendCertificateElement[]>([])
  
  const isDirty = ref(false) // แก้ไขแล้วหรือยัง
  const isLoading = ref(false)

  // --- Actions ---

  // 1. Load Existing Certificate (Call on Edit Event)
  const fetchCertificate = async (eventId: string) => {
    isLoading.value = true
    try {
      // 1.1 Get Template
      const template = await CertificateService.getTemplateByEventId(eventId)
      if (template) {
        currentTemplate.value = template
        // TODO: Set background preview from template.backgroundUrl if API provides it
        // pendingPreviewUrl.value = template.backgroundUrl 

        // 1.2 Get Elements
        const response = await CertificateService.getElements(template.id)
        if (response.data) {
           // Map DB elements to Frontend format
           pendingElements.value = response.data.map(el => ({
             id: el.id, // Keep DB ID
             type: el.fieldType, // Map fieldType to frontend type
             label: el.fieldName,
             x: el.x,
             y: el.y,
             value: el.placeHolder,
             fontSize: el.fontSize,
             fontFamily: el.fontFamily,
             color: el.color,
             fontWeight: el.fontWeight,
             textAlign: el.textAlign,
             dateFormat: el.dateFormat,
             width: el.width,
             height: el.height,
             // ... map other fields
           }))
        }
      } else {
        currentTemplate.value = null
        pendingElements.value = []
        pendingBackground.value = null
        pendingPreviewUrl.value = null
      }
    } catch (error) {
      console.error("Failed to fetch certificate", error)
    } finally {
      isLoading.value = false
    }
  }

  // 2. Set Data from Dialog (ยังไม่ยิง API)
  const setCertificateData = (file: File | null, preview: string | null, elements: FrontendCertificateElement[]) => {
    pendingBackground.value = file
    pendingPreviewUrl.value = preview
    pendingElements.value = elements
    isDirty.value = true
  }

  // 3. Execute Save (ยิง API จริง) - เรียกหลังจากสร้าง Event เสร็จ
  const saveCertificate = async (targetEventId: string) => {
    if (!isDirty.value && !currentTemplate.value) return // ไม่มีการเปลี่ยนแปลงและของเดิมไม่มี = ไม่ต้องทำอะไร

    try {
      isLoading.value = true
      let templateId = currentTemplate.value?.id

      // Step A: Create or Update Template
      const templateFormData = new FormData()
      templateFormData.append('eventId', targetEventId)
      
      if (pendingBackground.value) {
        templateFormData.append('file', pendingBackground.value)
      }

      if (!templateId) {
        // Create New Template
        if (pendingBackground.value) { // ต้องมี background ถึงจะสร้างได้ตาม logic ปกติ หรือ backend allow null?
             const res = await CertificateService.createTemplate(templateFormData)
             templateId = res.data.id
        }
      } else {
        // Update Existing Template
        if (pendingBackground.value) {
            await CertificateService.updateTemplate(templateId, templateFormData)
        }
      }

      if (!templateId) return // ถ้าสร้าง Template ไม่ได้ (เช่นไม่ได้อัพ Background) ก็จบ

      // Step B: Manage Elements (Strategy: Delete All & Re-create for Simplicity on MVP)
      // หรือถ้าจะ Advance คือเช็ค ID แต่เพื่อความชัวร์เรื่อง Position การลบแล้วสร้างใหม่ตาม Canvas จะตรงปกที่สุด
      
      // 1. Delete old elements (ถ้ามี template เดิม)
      if (currentTemplate.value) {
         const oldElements = await CertificateService.getElements(templateId)
         await Promise.all(oldElements.data.map(el => CertificateService.deleteElement(el.id)))
      }

      // 2. Create new elements
      const elementPromises = pendingElements.value.map(el => {
        const formData = new FormData()
        formData.append('templateId', templateId!)
        formData.append('fieldName', el.label || el.type)
        formData.append('fieldType', el.type) // ต้องมั่นใจว่า Enum ตรงกับ Backend
        formData.append('x', Math.round(el.x).toString())
        formData.append('y', Math.round(el.y).toString())
        
        if (el.width) formData.append('width', Math.round(el.width).toString())
        if (el.height) formData.append('height', Math.round(el.height).toString())
        if (el.value) formData.append('placeHolder', el.value) // Backend ใช้ field placeHolder เก็บ text/value
        if (el.fontSize) formData.append('fontSize', el.fontSize.toString())
        if (el.fontFamily) formData.append('fontFamily', el.fontFamily)
        if (el.color) formData.append('color', el.color)
        if (el.fontWeight) formData.append('fontWeight', el.fontWeight)
        if (el.textAlign) formData.append('textAlign', el.textAlign)
        if (el.dateFormat) formData.append('dateFormat', el.dateFormat)
        
        // Handle Image Element File Upload
        if (el.type === 'Image' && el.file) {
           formData.append('file', el.file)
        }

        return CertificateService.createElement(formData)
      })

      await Promise.all(elementPromises)
      
      // Reset State
      isDirty.value = false
      
    } catch (error) {
      console.error("Error saving certificate:", error)
      throw error // ให้ Component จัดการ error toast
    } finally {
      isLoading.value = false
    }
  }

  return {
    currentTemplate,
    pendingBackground,
    pendingPreviewUrl,
    pendingElements,
    isDirty,
    fetchCertificate,
    setCertificateData,
    saveCertificate
  }
})