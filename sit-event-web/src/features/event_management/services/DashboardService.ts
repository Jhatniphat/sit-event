import apiClient from '@/shared/utils/FetchUtils'
import { type ParsedApiError } from '@/shared/utils/FetchUtils'

export interface EventDashboardStats {
  event: {
    id: string
    name: string
    dates: {
      start: string
      end: string
    }
    status: string
  }
  stats: {
    totalRegistrations: number
    totalStaff: number
    attended: number
    checkedInPercentage: number
    capacity: {
      total: number
      used: number
      remaining: number
      percentage: number
    }
    registrationStatus: {
      pending: number
      approved: number
      rejected: number
    }
  }
}

export interface SessionDashboardStats {
  session: {
    id: string
    name: string
  }
  stats: {
    totalRegistrations: number
    attended: number
    checkedInPercentage: number
    capacity: {
      total: number
      used: number
      remaining: number
      percentage: number
    }
    registrationStatus: {
      pending: number
      approved: number
      rejected: number
    }
  }
}

function isApiError(error: unknown): error is ParsedApiError {
  return typeof error === 'object' && error !== null && 'message' in error && 'status' in error
}

export const DashboardService = {
  async getEventStats(eventId: string): Promise<EventDashboardStats> {
    try {
      const result = await apiClient.get<EventDashboardStats, EventDashboardStats>(
        `/dashboards/events/${eventId}/stats`
      )
      return result
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[DashboardService.getEventStats] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[DashboardService.getEventStats] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while fetching dashboard stats.')
    }
  },

  async getSessionStats(sessionId: string): Promise<SessionDashboardStats> {
    try {
      const result = await apiClient.get<SessionDashboardStats, SessionDashboardStats>(
        `/dashboards/sessions/${sessionId}/stats`
      )
      return result
    } catch (error: unknown) {
      if (isApiError(error)) {
        console.error(`[DashboardService.getSessionStats] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[DashboardService.getSessionStats] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while fetching session dashboard stats.')
    }
  }
}
