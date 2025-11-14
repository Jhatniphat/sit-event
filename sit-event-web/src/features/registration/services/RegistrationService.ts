import apiClient from '@/shared/utils/FetchUtils'
import { type ParsedApiError } from '@/shared/utils/FetchUtils'

export interface EventRegistration {
  id: string
  userId: string
  eventId: string
  sessionId?: string | null
  registeredAt: string
  attended: boolean
}

export interface RegisterForEventDto {
  sessionId?: string
}

function isApiError(error: unknown): error is ParsedApiError {
  return typeof error === 'object' && error !== null && 'message' in error && 'status' in error
}

export const RegistrationService = {
  /**
   * ลงทะเบียนเข้าร่วม Event
   * [POST] /events/{eventId}/register
   */
  async registerForEvent(eventId: string): Promise<EventRegistration> {
    try {
      const registration = await apiClient.post<EventRegistration, EventRegistration>(
        `events/${eventId}/register`,
      )
      return registration
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.registerForEvent] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error('[RegistrationService.registerForEvent] Unexpected Error:', error)
      throw new Error('An unexpected error occurred during registration.')
    }
  },

  /**
   * ยกเลิกการลงทะเบียนออกจาก Event
   * [DELETE] /events/{eventId}/unregister
   */
  async unregisterFromEvent(eventId: string): Promise<void> {
    try {
      await apiClient.delete<void, void>(`/events/${eventId}/unregister`)
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.unregisterFromEvent] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error('[RegistrationService.unregisterFromEvent] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while unregistering.')
    }
  },

  /**
   * ดึงข้อมูลการลงทะเบียนทั้งหมดของผู้ใช้
   * [GET] /users/me/registrations
   */
  async getMyRegistrations(): Promise<EventRegistration[]> {
    try {
      const registrations = await apiClient.get<EventRegistration[], EventRegistration[]>(
        '/users/me/registrations',
      )
      return registrations
    } catch (error) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.getMyRegistrations] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error('[RegistrationService.getMyRegistrations] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while fetching registrations.')
    }
  },
}
