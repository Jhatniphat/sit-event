// src/stores/eventStore.ts

import { defineStore } from 'pinia'
import {
  EventService,
  type Event,
  type CreateEventDto,
  type UpdateEventDto,
  type EventRegistration,
  type RegisterForEventDto,
  type PaginationMeta,
} from '@/features/event_management/services/EventServices'
import { type ParsedApiError } from '@/shared/utils/FetchUtils'

// 1. Interface
interface IEventState {
  events: Event[]
  pagination: PaginationMeta | null
  currentEvent: Event | null
  myRegistrations: EventRegistration[]
  isLoadingList: boolean
  isLoadingDetail: boolean
  isLoadingRegistration: boolean
  error: string | null
}

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

// 3. Store
export const useEventStore = defineStore('events', {
  state: (): IEventState => ({
    events: [],
    pagination: null,
    currentEvent: null,
    myRegistrations: [],
    isLoadingList: false,
    isLoadingDetail: false,
    isLoadingRegistration: false,
    error: null,
  }),

  getters: {
    getEventById: (state) => {
      return (id: string) => state.events.find((event: Event) => event.id === id)
    },
    hasEvents: (state) => state.events.length > 0,
    hasRegistrations: (state) => state.myRegistrations.length > 0,
  },

  actions: {
    // ... (fetchAllEvents, fetchEventById) ...

    /**
     * R = Read (All)
     */
    async fetchAllEvents(page: number, limit: number) {
      // if (this.hasEvents) {
      //   return
      // }
      this.isLoadingList = true
      this.error = null
      try {
        const { data, pagination } = await EventService.getAllEvents({ page: page, limit: limit })
        this.events = data
        this.pagination = pagination
      } catch (error) {
        this.error = handleError(error, 'Failed to fetch events.')
        console.error(this.error)
      } finally {
        this.isLoadingList = false
      }
    },

    /**
     * R = Read (One)
     */
    async fetchEventById(id: string) {
      const existingEvent = this.getEventById(id)
      if (existingEvent) {
        this.currentEvent = existingEvent
        return
      }
      this.isLoadingDetail = true
      this.error = null
      try {
        const data = await EventService.getEventById(id)
        this.currentEvent = data
        if (!this.events.some((e: Event) => e.id === data.id)) {
          this.events.push(data)
        }
      } catch (error) {
        this.error = handleError(error, 'Failed to fetch event details.')
        console.error(this.error)
      } finally {
        this.isLoadingDetail = false
      }
    },

    /**
     * C = Create
     */
    async createEvent(eventData: CreateEventDto) {
      this.isLoadingList = true
      this.error = null
      try {
        const newEvent = await EventService.createEvent(eventData)
        this.events.push(newEvent)
      } catch (error) {
        this.error = handleError(error, 'Failed to create event.')
        console.error(this.error)
        throw error
      } finally {
        this.isLoadingList = false
      }
    },

    /**
     * U = Update
     */
    async updateEvent(id: string, eventData: UpdateEventDto) {
      this.isLoadingDetail = true
      this.error = null
      try {
        const updatedEvent = await EventService.updateEvent(id, eventData)

        // [!] (FIX) แก้ไขโดยการเพิ่ม (e: Event)
        const index = this.events.findIndex((e: Event) => e.id === id)
        if (index !== -1) {
          this.events[index] = updatedEvent
        }

        if (this.currentEvent?.id === id) {
          this.currentEvent = updatedEvent
        }
      } catch (error) {
        this.error = handleError(error, 'Failed to update event.')
        console.error(this.error)
        throw error
      } finally {
        this.isLoadingDetail = false
      }
    },

    /**
     * D = Delete
     */
    async deleteEvent(id: string) {
      this.isLoadingList = true
      this.error = null
      try {
        await EventService.deleteEvent(id)

        // [!] (FIX) แก้ไขโดยการเพิ่ม (e: Event)
        this.events = this.events.filter((e: Event) => e.id !== id)

        if (this.currentEvent?.id === id) {
          this.currentEvent = null
        }
      } catch (error) {
        this.error = handleError(error, 'Failed to delete event.')
        console.error(this.error)
        throw error
      } finally {
        this.isLoadingList = false
      }
    },

    // ===== Registration Actions =====

    /**
     * ดึงข้อมูลการลงทะเบียนของฉัน (ถ้ายังไม่มี)
     */
    async fetchMyRegistrations() {
      if (this.hasRegistrations) {
        return
      }
      this.isLoadingRegistration = true
      this.error = null
      try {
        const data = await EventService.getMyRegistrations()
        this.myRegistrations = data
      } catch (error) {
        this.error = handleError(error, 'Failed to fetch registrations.')
        console.error(this.error)
      } finally {
        this.isLoadingRegistration = false
      }
    },

    /**
     * ลงทะเบียน Event
     */
    async registerForEvent(eventId: string, data: RegisterForEventDto) {
      this.isLoadingRegistration = true
      this.error = null
      try {
        const newRegistration = await EventService.registerForEvent(eventId, data)
        this.myRegistrations.push(newRegistration)
      } catch (error) {
        this.error = handleError(error, 'Failed to register.')
        console.error(this.error)
        throw error
      } finally {
        this.isLoadingRegistration = false
      }
    },
  },
})
