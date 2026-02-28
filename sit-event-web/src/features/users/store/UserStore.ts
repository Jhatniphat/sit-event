import { defineStore } from 'pinia'
import { UserService, type Profileinfo } from '../services/UserService'

interface UserState {
  profile: Profileinfo | null
  isLoading: boolean
  error: string | null
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    profile: null,
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchMyProfile() {
      this.isLoading = true
      this.error = null
      try {
        this.profile = await UserService.getMyUser()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'An unknown error occurred.'
      } finally {
        this.isLoading = false
      }
    },
  },
})
