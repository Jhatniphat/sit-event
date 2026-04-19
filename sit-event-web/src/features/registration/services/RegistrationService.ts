import type { EventTag, TargetAudience } from '@/features/event_management/services/EventServices'
import apiClient from '@/shared/utils/FetchUtils'
import { type ParsedApiError } from '@/shared/utils/FetchUtils'

/* ========= 기존 Registration Interfaces ========= */

export interface EventDetail {
  id: string
  createdAt: string | Date
  updatedAt: string | Date
  name: string
  description: string
  images: string[]
  thumbnail: string
  registrationOpenDate: string | Date
  registrationEndDate: string | Date
  eventStartDate: string | Date
  eventEndDate: string | Date
  allowOnSiteRegister: boolean
  targetAudience: TargetAudience[]
  tags: EventTag[]
  activityHours: number | null
  invitation: string | null
  website: string | null
  needWifi: boolean
  certificateCriteria: string | null
  creatorId: string | null
}

export interface EventSession {
  id: string
  eventId: string
  name: string
  description: string | null
  thumbnail: string | null
  startTime: string | Date
  endTime: string | Date
  location: string | null
  maxSeats: number | null
  availableSeats: number | null
  pointsAwarded: number | null
  autoRegister: boolean
}

export interface EventRegistration {
  id: string
  userId: string
  eventId: string
  sessionId: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESERVE'
  registeredAt: string | Date
  attended: boolean
  checkedInAt: string | Date | null
  certificateIssued: boolean
  pointsEarned: number | null
  notes: string | null
  event: EventDetail
  session?: EventSession
}

export interface AttendedStatusDto {
  attended: boolean
}

export interface RegisterForEventDto {
  sessionId?: string
}

/* ========= Staff Interfaces ========= */

export interface ApplyToBeStaffDto {
  eventRole?: string
}

export interface AddStaffDto {
  role: string
}

export type StaffApplicationStatus = 'ACCEPTED' | 'REFUSED' | 'PENDING' | 'WITHDRAWN'

export interface EventStaffApplication {
  id: string
  eventId: string
  event: EventDetail
  userId: string
  eventRole: string | null
  status: 'PENDING' | 'ACCEPTED' | 'REFUSED' | 'WITHDRAWN'
  createdAt: string | Date
  updatedAt: string | Date
}

/* ========= Error Checker ========= */

function isApiError(error: unknown): error is ParsedApiError {
  return typeof error === 'object' && error !== null && 'message' in error && 'status' in error
}

export interface PendingRegistration extends EventRegistration {
  // อาจจะมีการขยายในอนาคต
}

/* ========= SERVICE ========= */

export const RegistrationService = {
  /* --------------------------------------------------
   *  REGISTRATION SECTION
   * -------------------------------------------------- */

  async registerForEvent(
    eventId: string,
    payload?: RegisterForEventDto,
  ): Promise<EventRegistration> {
    try {
      const registration = await apiClient.post<RegisterForEventDto, EventRegistration>(
        `/events/${eventId}/register`,
        payload,
      )
      return registration
    } catch (error) {
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

  async unregisterFromEvent(eventId: string): Promise<void> {
    try {
      await apiClient.delete<void, void>(`/events/${eventId}/unregister`)
    } catch (error) {
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

  async getMyRegistrations(): Promise<EventRegistration[]> {
    try {
      const registration = await apiClient.get<void, EventRegistration[]>(
        `/events/registrations/me`,
      )
      return registration
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

  async cancelRegistrationById(registrationId: string): Promise<void> {
    try {
      await apiClient.delete<void, void>(`/events/registrations/${registrationId}/cancel`)
    } catch (error) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.cancelRegistrationById] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error('[RegistrationService.cancelRegistrationById] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while cancelling registration.')
    }
  },

  async changeAttendedStatusByRegistrationId(
    eventId: string,
    registrationId: string,
  ): Promise<EventRegistration> {
    try {
      return await apiClient.patch<AttendedStatusDto, EventRegistration>(
        `/events/${eventId}/registrations/${registrationId}`,
        { attended: true },
      )
    } catch (error) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.changeAttendedStatusByRegistrationId] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error(
        '[RegistrationService.changeAttendedStatusByRegistrationId] Unexpected Error:',
        error,
      )
      throw new Error('An unexpected error occurred while updating attended status.')
    }
  },

  async changeAttendedStatusByUserId(eventId: string, userId: string): Promise<EventRegistration> {
    try {
      return await apiClient.patch<AttendedStatusDto, EventRegistration>(
        `/events/${eventId}/users/${userId}`,
        { attended: true },
      )
    } catch (error) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.changeAttendedStatusByUserId] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error('[RegistrationService.changeAttendedStatusByUserId] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while updating attended status.')
    }
  },

  /* --------------------------------------------------
   *  STAFF SECTION
   * -------------------------------------------------- */

  /** [POST] /events/:eventId/staffs/apply */
  async applyToBeStaff(eventId: string, payload: ApplyToBeStaffDto) {
    try {
      return await apiClient.post<EventStaffApplication, ApplyToBeStaffDto>(
        `/events/${eventId}/staffs/apply`,
        payload,
      )
    } catch (error) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.applyToBeStaff] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      throw new Error('An unexpected error occurred while applying to be staff.')
    }
  },

  /** [GET] /events/staffs/status/me */
  async getMyStaffStatus() {
    try {
      return await apiClient.get<void, any>(`/events/staffs/status/me`)
    } catch (error) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.getMyStaffStatus] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error('[RegistrationService.getMyStaffStatus] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while fetching staff status.')
    }
  },

  /** [DELETE] /events/:eventId/staffs/me */
  async deleteMyStaffStatus(eventId: string) {
    try {
      return await apiClient.delete<void, void>(`/events/${eventId}/staffs/me`)
    } catch (error) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.deleteMyStaffStatus] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error('[RegistrationService.deleteMyStaffStatus] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while removing staff status.')
    }
  },

  /** [GET] /events/:eventId/staffs */
  async getAllStaffs(eventId: string) {
    try {
      return await apiClient.get<void, any[]>(`/events/${eventId}/staffs`)
    } catch (error) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.getAllStaffs] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error('[RegistrationService.getAllStaffs] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while fetching staffs.')
    }
  },

  /** [POST] /events/:eventId/staffs/:userId/add */
  async addStaff(eventId: string, userId: string, payload: AddStaffDto) {
    try {
      return await apiClient.post<AddStaffDto, any>(
        `/events/${eventId}/staffs/${userId}/add`,
        payload,
      )
    } catch (error) {
      if (isApiError(error)) {
        console.error(`[RegistrationService.addStaff] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[RegistrationService.addStaff] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while adding staff.')
    }
  },

  /** [PATCH] /events/:eventId/staffs/:staffId */
  async updateStaffRole(eventId: string, staffId: string, status: 'ACCEPTED' | 'REFUSED') {
    try {
      return await apiClient.patch<{ status: string }, any>(
        `/events/${eventId}/staffs/${staffId}`,
        { status },
      )
    } catch (error) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.updateStaffRole] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error('[RegistrationService.updateStaffRole] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while updating staff role.')
    }
  },

  /** [DELETE] /events/:eventId/staffs/:staffId */
  async removeStaff(eventId: string, staffId: string) {
    try {
      return await apiClient.delete<void, void>(`/events/${eventId}/staffs/${staffId}`)
    } catch (error) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.removeStaff] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error('[RegistrationService.removeStaff] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while removing staff from event.')
    }
  },

  /**
   * [PATCH] /events/:eventId/check-in/:userId
   * สำหรับ Staff สแกน QR Code เพื่อ Check-in ผู้เข้าร่วม
   */
  async checkInUser(eventId: string, userId: string): Promise<EventRegistration> {
    try {
      // ไม่ต้องส่ง body {} ไป เพราะ backend ไม่ได้รับ body
      return await apiClient.patch<void, EventRegistration>(
        `/events/${eventId}/check-in/${userId}`,
      )
    } catch (error) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.checkInUser] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error('[RegistrationService.checkInUser] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while checking in user.')
    }
  },

  async checkInSession(eventId: string, userId: string, sessionId: string): Promise<EventRegistration> {
    try {
      // ไม่ต้องส่ง body {} ไป เพราะ backend ไม่ได้รับ body
      return await apiClient.patch(`/events/${eventId}/check-in/${userId}/${sessionId}`)
    } catch (error) {
      if (isApiError(error)) {
        console.error(
          `[RegistrationService.checkInUser] API Error ${error.status}: ${error.message}`,
        )
        throw error
      }
      console.error('[RegistrationService.checkInSession] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while checking in session.')
    }
  },

  // ... (Methods เดิม: registerForEvent, unregisterFromEvent, etc.)

  /* --------------------------------------------------
   * ADMIN / ORGANIZER APPROVAL SECTION
   * -------------------------------------------------- */

  async getRegistrationColumns(eventId: string) {
    try {
      return await apiClient.get<
        void,
        { id: string; label: string; type: string; isSystem: boolean }[]
      >(`/events/${eventId}/registrations/columns`)
    } catch (error) {
       if (isApiError(error)) {
        console.error(`[RegistrationService.getRegistrationColumns] API Error ${error.status}: ${error.message}`)
        throw error
       }
      throw new Error('Failed to fetch registration columns')
    }
  },

  async getPendingRegistrations(
    eventId: string,
    fields?: string[],
    questionIds?: string[],
  ): Promise<any[]> {
    try {
      // Build query string
      const params = new URLSearchParams()
      if (fields && fields.length > 0) {
        params.append('fields', fields.join(','))
      }
      if (questionIds && questionIds.length > 0) {
        params.append('questionIds', questionIds.join(','))
      }

      const queryString = params.toString()
      const url = `/events/${eventId}/registrations/pending${queryString ? `?${queryString}` : ''}`

      return await apiClient.get<void, any[]>(url)
    } catch (error) {
      if (isApiError(error)) {
        console.error(`[RegistrationService.getPendingRegistrations] API Error ${error.status}: ${error.message}`)
        throw error
      }
      throw new Error('An unexpected error occurred while fetching pending registrations.')
    }
  },

  async approveRegistration(eventId: string, registrationId: string): Promise<void> {
    try {
      await apiClient.patch<void, void>(
        `/events/${eventId}/registrations/${registrationId}/approve`,
        {}
      )
    } catch (error) {
      if (isApiError(error)) {
        console.error(`[RegistrationService.approveRegistration] API Error ${error.status}: ${error.message}`)
        throw error
      }
      throw new Error('Failed to approve registration.')
    }
  },

  async rejectRegistration(eventId: string, registrationId: string): Promise<void> {
    try {
      await apiClient.patch<void, void>(
        `/events/${eventId}/registrations/${registrationId}/reject`,
        {}
      )
    } catch (error) {
      if (isApiError(error)) {
        console.error(`[RegistrationService.rejectRegistration] API Error ${error.status}: ${error.message}`)
        throw error
      }
      throw new Error('Failed to reject registration.')
    }
  },

  async exportRegistrations(eventId: string): Promise<Blob> {
    try {
      const blob = await apiClient.get<void, Blob>(
        `/events/${eventId}/registrations/export`,
        {
          responseType: 'blob',
        }
      )
      return blob
    } catch (error) {
      if (isApiError(error)) {
        console.error(`[RegistrationService.exportRegistrations] API Error ${error.status}: ${error.message}`)
        throw error
      }
      throw new Error('Failed to export registrations.')
    }
  },
}
