import apiClient from '@/shared/utils/FetchUtils';
import { type ParsedApiError } from '@/shared/utils/FetchUtils';

// ===== 1. Enums and Types (Based on api spec.txt) =====

export type EventTag =
  | 'SPEAK'
  | 'EDUCATION'
  | 'WORKSHOP'
  | 'SEMINAR'
  | 'COMPETITION'
  | 'SOCIAL'
  | 'CAREER';

export type TargetAudience =
  | 'EXTERNAL_STUDENT'
  | 'INTERNAL_STUDENT'
  | 'TEACHER'
  | 'PUBLIC';

/**
 * Interface สำหรับ Event (components.schemas.Event)
 * 
 */
export interface Event {
  id: string; // readOnly [cite: 9]
  name: string;
  description: string;
  thumbnail: string; // uri
  registrationOpenDate: Date; // date-time [cite: 9, 10]
  registrationEndDate: Date; // date-time [cite: 10]
  eventStartDate: Date; // date-time [cite: 10]
  eventEndDate: Date; // date-time [cite: 10]
  targetAudience: TargetAudience[]; 
  tags: EventTag[]; 
  creatorId: Date; // uuid, readOnly [cite: 11, 12]
  createdAt: Date; // date-time, readOnly [cite: 12]
}

/**
 * DTO สำหรับการ "สร้าง" Event (components.schemas.EventCreate)
 * 
 */
export interface CreateEventDto {
  name: string; // required [cite: 18]
  description: string; // required [cite: 18]
  thumbnail?: string; // uri
  registrationOpenDate: Date; // date-time, required [cite: 18, 19]
  registrationEndDate: Date; // date-time, required [cite: 18, 19]
  eventStartDate: Date; // date-time, required [cite: 18, 19]
  eventEndDate: Date; // date-time, required [cite: 18, 20]
  targetAudience?: TargetAudience[]; 
  tags?: EventTag[]; 
}
/**
 * DTO สำหรับการ "อัปเดต" Event
 * (api spec ระบุให้ใช้ PUT และ schema เดียวกับ EventCreate)
 * [cite: 38, 39]
 */
export type UpdateEventDto = CreateEventDto;

/**
 * Interface สำหรับการลงทะเบียน (components.schemas.EventRegistration)
 * 
 */
export interface EventRegistration {
  id: string; // uuid [cite: 13]
  userId: string; // uuid [cite: 13]
  eventId: string; // uuid [cite: 13]
  sessionId?: string | null; // uuid, nullable 
  registeredAt: string; // date-time [cite: 14]
  attended: boolean; // default: false [cite: 14]
}

/**
 * DTO สำหรับการ "ลงทะเบียน" (requestBody ของ /events/{eventId}/register)
 * 
 */
export interface RegisterForEventDto {
  sessionId?: string; // Optional [cite: 44]
}

// ===== 2. Type Guard for Error Handling =====
//
function isApiError(error: unknown): error is ParsedApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'status' in error
  );
}

// ===== 3. Event Service (CRUD Functions based on api spec.txt) =====
//
export const EventService = {
  /**
   * C = Create
   * สร้าง Event ใหม่
   * [POST] /events [cite: 34]
   */
  async createEvent(eventData: CreateEventDto): Promise<Event> {
    try {
      const newEvent = await apiClient.post<Event, Event>('/events', eventData);
      return newEvent;
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[EventService.createEvent] API Error ${error.status}: ${error.message}`);
        throw error;
      }
      console.error('[EventService.createEvent] Unexpected Error:', error);
      throw new Error('An unexpected error occurred while creating the event.');
    }
  },

  /**
   * R = Read (All)
   * ดึง Event ทั้งหมด (Public)
   * [GET] /events 
   */
  async getAllEvents(tag?: EventTag): Promise<Event[]> {
    try {
      const params = tag ? { tag: tag } : {};
      const events = await apiClient.get<Event[], Event[]>('/events', { params });
      return events;
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[EventService.getAllEvents] API Error ${error.status}: ${error.message}`);
        throw error;
      }
      console.error('[EventService.getAllEvents] Unexpected Error:', error);
      throw new Error('An unexpected error occurred while fetching events.');
    }
  },

  /**
   * R = Read (One)
   * ดึงข้อมูล Event ตาม ID
   * [GET] /events/{eventId} [cite: 37]
   */
  async getEventById(id: string): Promise<Event> {
    try {
      const event = await apiClient.get<Event, Event>(`/events/${id}`);
      return event;
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[EventService.getEventById] API Error ${error.status}: ${error.message}`);
        throw error;
      }
      console.error('[EventService.getEventById] Unexpected Error:', error);
      throw new Error('An unexpected error occurred while fetching the event.');
    }
  },

  /**
   * U = Update
   * อัปเดตข้อมูล Event (api spec ใช้ PUT)
   * [PUT] /events/{eventId} 
   */
  async updateEvent(id: string, eventData: UpdateEventDto): Promise<Event> {
    try {
      const updatedEvent = await apiClient.patch<Event, Event>(
        `/events/${id}`,
        eventData
      );
      return updatedEvent;
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[EventService.updateEvent] API Error ${error.status}: ${error.message}`);
        throw error;
      }
      console.error('[EventService.updateEvent] Unexpected Error:', error);
      throw new Error('An unexpected error occurred while updating the event.');
    }
  },

  /**
   * D = Delete
   * ลบ Event
   * [DELETE] /events/{eventId} [cite: 41]
   */
  async deleteEvent(id: string): Promise<void> {
    try {
      await apiClient.delete<unknown, void>(`/events/${id}`);
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[EventService.deleteEvent] API Error ${error.status}: ${error.message}`);
        throw error;
      }
      console.error('[EventService.deleteEvent] Unexpected Error:', error);
      throw new Error('An unexpected error occurred while deleting the event.');
    }
  },

  // ===== 4. Related Registration Functions (based on api spec.txt) =====

  /**
   * ลงทะเบียนเข้าร่วม Event
   * [POST] /events/{eventId}/register 
   */
  async registerForEvent(
    eventId: string,
    data: RegisterForEventDto
  ): Promise<EventRegistration> {
    try {
      const registration = await apiClient.post<
        EventRegistration,
        EventRegistration
      >(`/events/${eventId}/register`, data);
      return registration;
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[EventService.registerForEvent] API Error ${error.status}: ${error.message}`);
        throw error;
      }
      console.error('[EventService.registerForEvent] Unexpected Error:', error);
      throw new Error('An unexpected error occurred during registration.');
    }
  },

  /**
   * ดึงข้อมูลการลงทะเบียนทั้งหมดของฉัน
   * [GET] /users/me/registrations 
   */
  async getMyRegistrations(): Promise<EventRegistration[]> {
    try {
      const registrations = await apiClient.get<
        EventRegistration[],
        EventRegistration[]
      >('/users/me/registrations');
      return registrations;
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[EventService.getMyRegistrations] API Error ${error.status}: ${error.message}`);
        throw error;
      }
      console.error('[EventService.getMyRegistrations] Unexpected Error:', error);
      throw new Error("An unexpected error occurred while fetching user's registrations.");
    }
  },
};