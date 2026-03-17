import { defineStore } from 'pinia'
import { DashboardService, type EventDashboardStats, type SessionDashboardStats } from '../services/DashboardService'

interface DashboardState {
  stats: EventDashboardStats | null
  sessionStatsRecord: Record<string, SessionDashboardStats>
  isLoading: boolean
  error: string | null
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    stats: null,
    sessionStatsRecord: {},
    isLoading: false,
    error: null,
  }),
  actions: {
    async fetchEventStats(eventId: string) {
      this.isLoading = true
      this.error = null
      try {
        const data = await DashboardService.getEventStats(eventId)
        this.stats = data
      } catch (err: any) {
        this.error = err?.message || 'Failed to loaded dashboard stats'
      } finally {
        this.isLoading = false
      }
    },
    async fetchAllSessionStats(sessionIds: string[]) {
      this.isLoading = true
      this.error = null
      try {
        const promises = sessionIds.map(id => DashboardService.getSessionStats(id))
        const results = await Promise.all(promises)
        results.forEach(data => {
          this.sessionStatsRecord[data.session.id] = data
        })
      } catch (err: any) {
        this.error = err?.message || 'Failed to loaded session dashboard stats'
      } finally {
        this.isLoading = false
      }
    },
    clearStats() {
      this.stats = null
      this.sessionStatsRecord = {}
      this.error = null
      this.isLoading = false
    }
  }
})
