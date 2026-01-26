import apiClient from '@/shared/utils/FetchUtils'
import { type ParsedApiError } from '@/shared/utils/FetchUtils'

// ===== 1. Interfaces & Types =====

// Re-export or Define types needed for the service
export interface CertificateTemplate {
  id: string
  eventId: string
  backgroundUrl?: string // สมมติว่า backend return url หรือ path
  createdAt: string
  updatedAt: string
}

export interface CertificateElement {
  id: string
  templateId: string
  fieldName: string
  fieldType: string
  x: number
  y: number
  width?: number
  height?: number
  placeHolder?: string
  fontSize?: number
  fontFamily?: string
  color?: string
  fontWeight?: string
  textAlign?: string
  dateFormat?: string
}

// ===== 2. Type Guard for Error Handling =====
function isApiError(error: unknown): error is ParsedApiError {
  return typeof error === 'object' && error !== null && 'message' in error && 'status' in error
}

// ===== 3. Certificate Service Methods =====
export const CertificateService = {
  
  // --- Templates ---

  /**
   * ดึง Template ตาม Event ID
   * [GET] /certificates/templates?eventId=...
   */
  async getTemplateByEventId(eventId: string): Promise<CertificateTemplate | null> {
    try {
      const response = await apiClient.get<CertificateTemplate[], CertificateTemplate[]>(
        `/certificates/templates`, 
        { params: { eventId } }
      )
      // Return the first one found or null
      return response && response.length > 0 ? response[0] : null
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[CertificateService.getTemplateByEventId] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[CertificateService.getTemplateByEventId] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while fetching the certificate template.')
    }
  },

  /**
   * สร้าง Template ใหม่
   * [POST] /certificates/templates
   */
  async createTemplate(formData: FormData): Promise<CertificateTemplate> {
    try {
      const template = await apiClient.post<CertificateTemplate, CertificateTemplate>(
        '/certificates/templates',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      )
      return template
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[CertificateService.createTemplate] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[CertificateService.createTemplate] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while creating the certificate template.')
    }
  },

  /**
   * อัปเดต Template (เช่น เปลี่ยนพื้นหลัง)
   * [PATCH] /certificates/templates/{id}
   */
  async updateTemplate(id: string, formData: FormData): Promise<CertificateTemplate> {
    try {
      const updatedTemplate = await apiClient.patch<CertificateTemplate, CertificateTemplate>(
        `/certificates/templates/${id}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      )
      return updatedTemplate
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[CertificateService.updateTemplate] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[CertificateService.updateTemplate] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while updating the certificate template.')
    }
  },

  // --- Elements ---

  /**
   * ดึง Elements ทั้งหมดของ Template
   * [GET] /certificates/templates/{templateId}/elements
   */
  async getElements(templateId: string): Promise<CertificateElement[]> {
    try {
      const elements = await apiClient.get<CertificateElement[], CertificateElement[]>(
        `/certificates/templates/${templateId}/elements`
      )
      return elements
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[CertificateService.getElements] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[CertificateService.getElements] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while fetching certificate elements.')
    }
  },

  /**
   * สร้าง Element ใหม่
   * [POST] /certificates/elements
   */
  async createElement(formData: FormData): Promise<CertificateElement> {
    try {
      const element = await apiClient.post<CertificateElement, CertificateElement>(
        '/certificates/elements',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      )
      return element
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[CertificateService.createElement] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[CertificateService.createElement] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while creating the certificate element.')
    }
  },

  /**
   * อัปเดต Element
   * [PATCH] /certificates/elements/{id}
   */
  async updateElement(id: string, formData: FormData): Promise<CertificateElement> {
    try {
      const updatedElement = await apiClient.patch<CertificateElement, CertificateElement>(
        `/certificates/elements/${id}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      )
      return updatedElement
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[CertificateService.updateElement] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[CertificateService.updateElement] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while updating the certificate element.')
    }
  },

  /**
   * ลบ Element
   * [DELETE] /certificates/elements/{id}
   */
  async deleteElement(id: string): Promise<void> {
    try {
      await apiClient.delete<void, void>(`/certificates/elements/${id}`)
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[CertificateService.deleteElement] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[CertificateService.deleteElement] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while deleting the certificate element.')
    }
  }
}