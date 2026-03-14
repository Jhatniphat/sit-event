import apiClient from '@/shared/utils/FetchUtils'
import type { QuestionType } from '../store/FormStore'

export interface FormFieldPayload {
  question: string
  fieldType: QuestionType
  isRequired: boolean
  order: number
  options?: string[]
}

export enum FormType {
  PRE_EVENT = 'PRE_EVENT',
  POST_EVENT = 'POST_EVENT',
}

export interface CreateEventFormDto {
  title: string
  description?: string
  isActive: boolean
  type?: FormType
}

export interface SubmitAnswerPayload {
  fieldId: string
  answer: string | string[]
}

export interface SubmitFormDto {
  answers: SubmitAnswerPayload[]
}

// === Interfaces สำหรับ Response Data (ตัวอย่างตามโครงสร้างทั่วไป) ===
export interface FormFieldResponse extends FormFieldPayload {
  id: string
}

export interface EventFormResponse {
  id: string
  eventId: string
  type: FormType
  title: string
  description?: string
  isActive: boolean
  fields: FormFieldResponse[]
}

export interface SubmissionSummary {
  totalSubmissions: number
  statistics: Record<string, unknown>
}

export interface BulkDeleteFieldsDto {
  fieldIds: string[]
}

export interface ReorderFieldItem {
  id: string
  order: number
}

export interface ReorderFieldsDto {
  fields: ReorderFieldItem[]
}

export interface SubmissionUser {
  id: string
  email: string
  firstName: string
  lastName: string
}

export interface SubmissionAnswer {
  id: string
  submissionId: string
  fieldId: string
  answer: string
  field: {
    id: string
    question: string
    fieldType: QuestionType
  }
}

export interface FormSubmissionResponse {
  id: string
  formId: string
  userId: string
  submittedAt: string
  user: SubmissionUser
  answers: SubmissionAnswer[]
}

export class FormService {
  /**
   * ==========================================
   * ฝั่ง ADMIN / ORGANIZER (จัดการฟอร์ม)
   * ==========================================
   */

  static async createForm(eventId: string, data: CreateEventFormDto): Promise<EventFormResponse> {
    return apiClient.post(`/events/${eventId}/forms`, data)
  }

  static async addFields(
    eventId: string,
    formId: string,
    fields: FormFieldPayload[],
  ): Promise<FormFieldResponse[]> {
    return apiClient.post(`/events/${eventId}/forms/${formId}/fields`, fields)
  }

  static async updateForm(
    eventId: string,
    formId: string,
    data: Partial<CreateEventFormDto>,
  ): Promise<EventFormResponse> {
    return apiClient.patch(`/events/${eventId}/forms/${formId}`, data)
  }

  static async deleteForm(eventId: string, formId: string): Promise<void> {
    return apiClient.delete(`/events/${eventId}/forms/${formId}`)
  }

  static async deleteFields(
    eventId: string,
    formId: string,
    data: BulkDeleteFieldsDto,
  ): Promise<void> {
    return apiClient.delete(`/events/${eventId}/forms/${formId}/fields`, { data })
  }

  static async updateField(
    eventId: string,
    formId: string,
    fieldId: string,
    data: Partial<FormFieldPayload>,
  ): Promise<FormFieldResponse> {
    return apiClient.patch(`/events/${eventId}/forms/${formId}/fields/${fieldId}`, data)
  }

  static async reorderFields(
    eventId: string,
    formId: string,
    data: ReorderFieldsDto,
  ): Promise<void> {
    return apiClient.patch(`/events/${eventId}/forms/${formId}/fields/reorder`, data)
  }

  static async getFormSummary(eventId: string, formId: string): Promise<SubmissionSummary> {
    return apiClient.get(`/events/${eventId}/forms/${formId}/summary`)
  }

  /**
   * ==========================================
   * ฝั่ง USER / PARTICIPANT (กรอกฟอร์ม)
   * ==========================================
   */

  static async getFormForUser(eventId: string, type?: FormType): Promise<EventFormResponse> {
    const params = type ? { type } : {}
    return apiClient.get(`/events/${eventId}/forms`, { params })
  }

  static async getForms(eventId: string): Promise<EventFormResponse[]> {
    return apiClient.get(`/events/${eventId}/forms`)
  }

  static async getFormById(eventId: string, formId: string): Promise<EventFormResponse> {
    return apiClient.get(`/events/${eventId}/forms/${formId}`)
  }

  static async submitForm(
    eventId: string,
    formId: string,
    data: SubmitFormDto,
  ): Promise<{ submissionId: string }> {
    return apiClient.post(`/events/${eventId}/forms/${formId}/submit`, data)
  }

  static async getMySubmission(eventId: string, formId: string): Promise<SubmitFormDto> {
    return apiClient.get(`/events/${eventId}/forms/${formId}/my-submission`)
  }

  static async getAllSubmission(
    eventId: string,
    formId: string,
  ): Promise<FormSubmissionResponse[]> {
    return apiClient.get(`/events/${eventId}/forms/${formId}/submissions`)
  }
}
