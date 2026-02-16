import { defineStore } from 'pinia'
import {
  EventService,
  type Event,
  type CreateEventDto,
  type UpdateEventDto,
  type EventRegistration,
  type RegisterForEventDto,
  type PaginationMeta,
  type EventSession,     
  type CreateSessionDto, 
  type UpdateSessionDto  
} from '@/features/event_management/services/EventServices'
import { type ParsedApiError } from '@/shared/utils/FetchUtils'

// 1. Interface
interface IEventState {
  events: Event[]
  pagination: PaginationMeta | null
  currentEvent: Event | null
  currentEventSessions: EventSession[]
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
    // * ===== Event Actions =====

    /**
     * R = Read (All)
     */
    async fetchAllEvents(page: number, limit: number) {
      if (this.events.length > 0 && this.pagination?.page === page) {
         // logic cache อย่างง่าย
      }
      this.isLoadingList = true
      this.error = null
      try {
        const { data, pagination } = await EventService.getAllEvents({ page, limit })
        this.events = data
        this.pagination = pagination
      } catch (error) {
        this.error = handleError(error, 'Failed to fetch events.')
      } finally {
        this.isLoadingList = false
      }
    },

    async fetchEventById(id: string) {
      // Clear previous sessions when switching event detail
      if (this.currentEvent?.id !== id) {
        this.currentEventSessions = [] 
      }
      
      this.isLoadingDetail = true
      this.error = null
      try {
        const data = await EventService.getEventById(id)
        this.currentEvent = data
        // Update list if exists
        const index = this.events.findIndex(e => e.id === id)
        if (index === -1) {
            this.events.push(data)
        } else {
            this.events[index] = data
        }
      } catch (error) {
        this.error = handleError(error, 'Failed to fetch event details.')
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
        return newEvent // Return เพื่อเอา ID ไปใช้สร้าง Session ต่อ
      } catch (error) {
        this.error = handleError(error, 'Failed to create event.')
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

    // * ===== Session Actions =====
    
    async fetchEventSessions(eventId: string) {
      try {
        const sessions = await EventService.getEventSessions(eventId)
        this.currentEventSessions = sessions
        console.log('Fetched Sessions:', sessions)
        console.log('Current Store Sessions:', this.currentEventSessions)
      } catch (error) {
        console.error(handleError(error, 'Failed to fetch sessions'))
        // ไม่ throw error เพื่อไม่ให้บล็อกการทำงานหลัก แค่ sessions ไม่ขึ้น
      }
    },

    async createSession(eventId: string, sessionData: CreateSessionDto) {
      try {
        const newSession = await EventService.createSession(eventId, sessionData)
        console.log('Before Push, Current Sessions:', this.currentEventSessions)
        console.log('New Session Created:', newSession)
        this.currentEventSessions.push(newSession)
        console.log('After Push, Current Sessions:', this.currentEventSessions)
      } catch (error) {
        throw error
      }
    },

    async updateSession(eventId: string, sessionId: string, sessionData: UpdateSessionDto) {
      try {
        const updatedSession = await EventService.updateSession(eventId, sessionId, sessionData)
        const index = this.currentEventSessions.findIndex(s => s.id === sessionId)
        if (index !== -1) {
          this.currentEventSessions[index] = updatedSession
        }
      } catch (error) {
        throw error
      }
    },

    async deleteSession(eventId: string, sessionId: string) {
      try {
        await EventService.deleteSession(eventId, sessionId)
        this.currentEventSessions = this.currentEventSessions.filter(s => s.id !== sessionId)
      } catch (error) {
        throw error
      }
    },


    // * ===== Registration Actions =====

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

    async registerForSession(eventId: string, sessionId: string) {
      this.isLoadingRegistration = true
      this.error = null
      try {
        const newRegistration = await EventService.registerForSession(eventId, sessionId)
        this.myRegistrations.push(newRegistration)
      } catch (error) {
        this.error = handleError(error, 'Failed to register for session.')
        console.error(this.error)
        throw error
      } finally {
        this.isLoadingRegistration = false
      }
    },
  },
})
