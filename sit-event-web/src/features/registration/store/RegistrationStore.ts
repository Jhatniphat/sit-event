import { defineStore } from 'pinia'
import {
  RegistrationService,
  type ApplyToBeStaffDto,
  type EventDetail,
  type EventRegistration,
  type EventStaffApplication,
  type RegisterForEventDto,
  type StaffApplicationStatus,
} from '@/features/registration/services/RegistrationService'
import type { ParsedApiError } from '@/shared/utils/FetchUtils'

// ✔ Error Helper (ไม่ใช้ any)
const handleError = (error: unknown, defaultMessage: string): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ParsedApiError).message === 'string'
  ) {
    return (error as ParsedApiError).message
  }
  return defaultMessage
}

export interface StaffApplication {
  id: string
  eventId: string
  userId: string
  eventRole: string | null
  status: StaffApplicationStatus
  createdAt: string | Date
  updatedAt: string | Date
  event: EventDetail
}

export interface AddStaffRequest {
  role: string
}

/* ========= Store State ========= */

export interface RegistrationState {
  myRegistrations: EventRegistration[]

  myStaffStatus: StaffApplication[] | null
  staffsForEvent: StaffApplication[]

  isLoading: boolean
  error: string | null
}

export const useRegistrationStore = defineStore('registration', {
  state: (): RegistrationState => ({
    myRegistrations: [],

    // staff
    myStaffStatus: [],
    staffsForEvent: [],

    isLoading: false,
    error: null,
  }),

  getters: {
    hasRegistrations: (state): boolean => state.myRegistrations.length > 0,

    // เช็คว่า user ลงทะเบียน event นี้หรือยัง
    isRegistered:
      (state) =>
        (eventId: string): boolean =>
          state.myRegistrations.some((r) => r.eventId === eventId),

    // ดึง registration ของ eventId นั้นๆ
    getRegistrationByEventId:
      (state) =>
        (eventId: string): EventRegistration | undefined =>
          state.myRegistrations.find((r) => r.eventId === eventId),

    // isStaffAccepted: (state) => state.myStaffStatus?.status === 'ACCEPTED',
    // isStaffRefused: (state) => state.myStaffStatus?.status === 'REFUSED',
  },

  actions: {
    /**
     * โหลดข้อมูล registration ของตัวเองทั้งหมด
     */
    async fetchMyRegistrations() {
      this.isLoading = true
      this.error = null
      try {
        const data = await RegistrationService.getMyRegistrations()
        this.myRegistrations = data
      } catch (error) {
        this.error = handleError(error, 'Failed to load registrations.')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * ลงทะเบียน Event
     */
    async registerForEvent(
      eventId: string,
      payload?: RegisterForEventDto,
    ): Promise<EventRegistration | void> { // เปลี่ยน Return type นิดหน่อย
      this.isLoading = true
      this.error = null
      try {
        // 1. ยิง API ลงทะเบียนตามปกติ
        await RegistrationService.registerForEvent(eventId, payload)
        // 2. ดึงข้อมูลการลงทะเบียนของฉันใหม่อีกครั้ง เพื่ออัปเดต state
        await this.fetchMyRegistrations()

      } catch (error) {
        this.error = handleError(error, 'Failed to register for event.')
        throw error
      } finally {
        this.isLoading = false
      }
    },
    /**
     * Unregister
     */
    async unregisterFromEvent(eventId: string): Promise<void> {
      this.isLoading = true
      this.error = null
      try {
        await RegistrationService.unregisterFromEvent(eventId)

        // ✅ FIX: ใช้การตรวจสอบที่ครอบคลุม (Fallback ไปหา r.event.id หาก r.eventId ไม่มีค่า)
        this.myRegistrations = this.myRegistrations.filter((r) => {
          const registrationEventId = r.eventId ?? r.event?.id
          return registrationEventId !== eventId
        })

      } catch (error) {
        this.error = handleError(error, 'Failed to unregister from event.')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Admin — mark attended by registrationId
     */
    async markAttendedByRegistrationId(
      eventId: string,
      registrationId: string,
    ): Promise<EventRegistration> {
      this.isLoading = true
      this.error = null
      try {
        const updated = await RegistrationService.changeAttendedStatusByRegistrationId(
          eventId,
          registrationId,
        )

        // update state
        const index = this.myRegistrations.findIndex((r) => r.id === registrationId)
        if (index !== -1) this.myRegistrations[index] = updated

        return updated
      } catch (error) {
        this.error = handleError(error, 'Failed to update attended status.')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * ผู้ใช้ทั่วไป — Check-in ด้วย userId
     */
    async markAttendedByUserId(eventId: string, userId: string): Promise<EventRegistration> {
      this.isLoading = true
      this.error = null
      try {
        const updated = await RegistrationService.changeAttendedStatusByUserId(eventId, userId)

        // เช่นเดียวกัน find แล้ว update
        const index = this.myRegistrations.findIndex(
          (r) => r.eventId === eventId && r.userId === userId,
        )
        if (index !== -1) this.myRegistrations[index] = updated

        return updated
      } catch (error) {
        this.error = handleError(error, 'Failed to check-in.')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Admin — cancel registration by registrationId
     */
    async cancelRegistration(registrationId: string): Promise<void> {
      this.isLoading = true
      this.error = null
      try {
        await RegistrationService.cancelRegistrationById(registrationId)

        this.myRegistrations = this.myRegistrations.filter((r) => r.id !== registrationId)
      } catch (error) {
        this.error = handleError(error, 'Failed to cancel registration.')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /* ============================
     *      STAFF ACTIONS
     * ============================ */

    async fetchMyStaffStatus(): Promise<void> {
      this.isLoading = true
      this.error = null
      try {
        const data = await RegistrationService.getMyStaffStatus()
        this.myStaffStatus = data
      } catch (error) {
        this.error = handleError(error, 'Failed to load staff status.')
      } finally {
        this.isLoading = false
      }
    },

    async applyToBeStaff(
      eventId: string,
      body: ApplyToBeStaffDto,
    ): Promise<StaffApplication | void> {
      this.isLoading = true
      this.error = null
      try {
        await RegistrationService.applyToBeStaff(eventId, body)

        // ลบการ push แบบเดิมออก
        // if (this.myStaffStatus) { ... }

        // สั่งโหลดข้อมูล Staff ใหม่ทั้งหมด
        await this.fetchMyStaffStatus()

      } catch (error) {
        this.error = handleError(error, 'Failed to apply to be staff.')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async deleteMyStaffStatus(eventId: string): Promise<void> {
      this.isLoading = true
      this.error = null
      try {
        await RegistrationService.deleteMyStaffStatus(eventId)
        if (this.myStaffStatus) {
          this.myStaffStatus = this.myStaffStatus.filter((s) => {
            const appEventId = s.eventId ?? s.event?.id
            return appEventId !== eventId
          })
        }

      } catch (error) {
        this.error = handleError(error, 'Failed to delete staff status.')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async fetchStaffsForEvent(eventId: string): Promise<void> {
      this.isLoading = true
      this.error = null
      try {
        const data = await RegistrationService.getAllStaffs(eventId)
        this.staffsForEvent = data
      } catch (error) {
        this.error = handleError(error, 'Failed to load event staffs.')
      } finally {
        this.isLoading = false
      }
    },

    async addStaffToEvent(
      eventId: string,
      userId: string,
      body: AddStaffRequest,
    ): Promise<StaffApplication> {
      this.isLoading = true
      this.error = null
      try {
        const added = await RegistrationService.addStaff(eventId, userId, body)
        this.staffsForEvent.push(added)
        return added
      } catch (error) {
        this.error = handleError(error, 'Failed to add staff.')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async updateStaffStatus(
      eventId: string,
      staffId: string,
      status: 'ACCEPTED' | 'REFUSED',
    ): Promise<StaffApplication> {
      this.isLoading = true
      this.error = null
      try {
        const updated = await RegistrationService.updateStaffRole(eventId, staffId, status)

        const index = this.staffsForEvent.findIndex((s) => s.id === staffId)
        if (index !== -1) this.staffsForEvent[index] = updated

        return updated
      } catch (error) {
        this.error = handleError(error, 'Failed to update staff status.')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async removeStaffFromEvent(eventId: string, staffId: string): Promise<void> {
      this.isLoading = true
      this.error = null
      try {
        await RegistrationService.removeStaff(eventId, staffId)
        this.staffsForEvent = this.staffsForEvent.filter((s) => s.id !== staffId)
      } catch (error) {
        this.error = handleError(error, 'Failed to remove staff.')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Staff Action — Check-in User by QR Code
     * เรียก API ใหม่: PATCH /events/:eventId/check-in/:userId
     */
    async checkInUser(eventId: string, userId: string): Promise<EventRegistration> {
      this.isLoading = true
      this.error = null
      try {
        const updated = await RegistrationService.checkInUser(eventId, userId)
        // Return ข้อมูลล่าสุดกลับไปให้ Component (เช่น หน้า Staff Scan) เพื่อแสดงผล Success
        return updated
      } catch (error) {
        this.error = handleError(error, 'Failed to check-in user.')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async checkInSession(eventId: string, userId: string, sessionId: string): Promise<EventRegistration> {
      this.isLoading = true
      this.error = null
      try {
        const updated = await RegistrationService.checkInSession(eventId, userId, sessionId)
        return updated
      } catch (error) {
        this.error = handleError(error, 'Failed to check-in user.')
        throw error
      } finally {
        this.isLoading = false
      }
    },
  },
})
