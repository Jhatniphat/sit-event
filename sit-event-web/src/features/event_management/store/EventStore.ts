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
  type UpdateSessionDto,
  type ParticipantPaginationResponse,
  type GetParticipantsParams,
  type ParticipantInfo,
  type ParticipantSummary,
  type EventTag,
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
  isLoadingPartiList: boolean
  error: string | null
  participantsData: ParticipantPaginationResponse | null
  allParticipants: ParticipantInfo[]
  summaryAttendance: ParticipantSummary
  paginationParticipant: PaginationMeta
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
    currentEventSessions: [],
    myRegistrations: [],
    isLoadingList: false,
    isLoadingDetail: false,
    isLoadingRegistration: false,
    isLoadingPartiList: false,
    error: null,
    participantsData: null as ParticipantPaginationResponse | null,
    allParticipants: [] as ParticipantInfo[],
    summaryAttendance: {} as ParticipantSummary,
    paginationParticipant: {} as PaginationMeta,
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
    async fetchAllEvents(params: { page: number; limit: number; name?: string; tags?: string }) {
      // Logic การ Cache: ถ้า Params เหมือนเดิมเป๊ะๆ อาจจะไม่ต้องยิงใหม่
      // แต่ถ้าเป็นการ Search (มี name หรือ tag) แนะนำให้ยิงใหม่เสมอเพื่อให้ข้อมูลสดใหม่
      this.isLoadingList = true
      this.error = null
      console.log('Fetching events with params:', params)

      try {
        const { data, pagination } = await EventService.getAllEvents({
          page: params.page,
          limit: params.limit,
          name: params.name || undefined,
          tags: params.tags === 'ALL' ? undefined : (params.tags as EventTag), // ถ้าเป็น ALL ส่ง undefined
        })

        this.events = data
        console.log('this.events:', this.events)
        this.pagination = pagination
      } catch (error) {
        // ใช้ helper handleError ที่คุณมีอยู่
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
        const index = this.events.findIndex((e) => e.id === id)
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
      } catch (error) {
        console.error(handleError(error, 'Failed to fetch sessions'))
      }
    },

    async createSession(eventId: string, sessionData: CreateSessionDto | FormData) {
      try {
        const newSession = await EventService.createSession(eventId, sessionData)
        this.currentEventSessions.push(newSession)
      } catch (error) {
        throw error
      }
    },

    async updateSession(eventId: string, sessionId: string, sessionData: UpdateSessionDto | FormData) {
      try {
        const updatedSession = await EventService.updateSession(eventId, sessionId, sessionData)
        const index = this.currentEventSessions.findIndex((s) => s.id === sessionId)
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
        this.currentEventSessions = this.currentEventSessions.filter((s) => s.id !== sessionId)
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
    // Get All Participants For Staff
    async participantsListForEvent(
      eventId: string,
      params?: GetParticipantsParams,
    ) {
      this.isLoadingPartiList = true
      this.error = null
      try {
        const participants = await EventService.participantsForEvent(eventId, params)
        this.participantsData = participants
        this.allParticipants = participants.data
        this.summaryAttendance = participants.summary
        this.pagination = participants.pagination
      } catch (error) {
        this.error = handleError(error, 'Failed to fetch participants.')
        console.error(this.error)
        throw error
      } finally {
        this.isLoadingPartiList = false
      }
    },
    async participantsListForSession(
      eventId: string,
      sessionId: string,
      params?: GetParticipantsParams,
    ) {
      this.isLoadingPartiList = true
      this.error = null
      try {
        const participants = await EventService.participantsForSession(eventId, sessionId, params)
        this.participantsData = participants
        this.allParticipants = participants.data
        this.summaryAttendance = participants.summary
        this.pagination = participants.pagination
      } catch (error) {
        this.error = handleError(error, 'Failed to fetch participants.')
        console.error(this.error)
        throw error
      } finally {
        this.isLoadingPartiList = false
      }
    },
  },
})
