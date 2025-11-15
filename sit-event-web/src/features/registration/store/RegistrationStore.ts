import { defineStore } from 'pinia'
import {
  RegistrationService,
  type EventRegistration,
} from '@/features/registration/services/RegistrationService'
import type { ParsedApiError } from '@/shared/utils/FetchUtils'

// 2. Error Helper
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

export interface RegistrationState {
  myRegistrations: EventRegistration[]
  isLoading: boolean
  error: string | null
}

export const useRegistrationStore = defineStore('registration', {
  state: (): RegistrationState => ({
    myRegistrations: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    hasRegistrations: (state) => state.myRegistrations.length > 0,

    // ตรวจสอบว่า user ลงทะเบียนใน eventId นั้นหรือยัง
    isRegistered: (state) => (eventId: string) =>
      state.myRegistrations.some((r: { eventId: string }) => r.eventId === eventId),
  },

  actions: {
    /**
     * ดึงข้อมูลการลงทะเบียนทั้งหมดของผู้ใช้
     */
    async fetchMyRegistrations() {
      this.isLoading = true
      this.error = null
      try {
        const data = await RegistrationService.getMyRegistrations()
        this.myRegistrations = data
      } catch (error) {
        console.error('[registrationStore.fetchMyRegistrations]', error)
        this.error = handleError(error, 'Failed to load registrations.')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * ลงทะเบียนเข้าร่วม Event
     */
    async registerForEvent(eventId: string) {
      this.isLoading = true
      this.error = null
      try {
        const registration = await RegistrationService.registerForEvent(eventId)
        this.myRegistrations.push(registration)
        return registration
      } catch (error) {
        console.error('[registrationStore.registerForEvent]', error)
        this.error = handleError(error, 'Failed to register for event.')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * ยกเลิกการลงทะเบียนออกจาก Event
     */
    async unregisterFromEvent(eventId: string) {
      this.isLoading = true
      this.error = null
      try {
        await RegistrationService.unregisterFromEvent(eventId)
        // ลบข้อมูล registration ที่เกี่ยวข้องออกจาก state
        this.myRegistrations = this.myRegistrations.filter(
          (r: { eventId: string }) => r.eventId !== eventId,
        )
      } catch (error) {
        console.error('[registrationStore.unregisterFromEvent]', error)
        this.error = handleError(error, 'Failed to unregister from event.')
        throw error
      } finally {
        this.isLoading = false
      }
    },
  },
})
