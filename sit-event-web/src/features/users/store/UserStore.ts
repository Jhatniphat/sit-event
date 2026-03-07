import { defineStore } from 'pinia'
import { UserService, type Profileinfo, type UpdateUserDto } from '../services/UserService'

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
    async updateProfileInfo(updateDto: UpdateUserDto) {
      this.isLoading = true
      this.error = null
      try {
        console.log('Updating profile with data:', updateDto)
        const updatedProfile = await UserService.updateMyProfile(updateDto)

        // อัปเดต State ใน Store ให้เป็นค่าใหม่ที่ได้จาก Server
        if (this.profile) {
          this.profile = { ...this.profile, ...updatedProfile }
        } else {
          this.profile = updatedProfile
        }
        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Update failed.'
        return false // ส่งค่ากลับว่าล้มเหลว
      } finally {
        this.isLoading = false
      }
    },

    async deleteProfile() {
      this.isLoading = true
      this.error = null
      try {
        await UserService.deleteMyProfile()

        // ล้างข้อมูลใน Store เมื่อลบโปรไฟล์สำเร็จ
        this.profile = null
        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Deletion failed.'
        return false
      } finally {
        this.isLoading = false
      }
    },
  },
})
