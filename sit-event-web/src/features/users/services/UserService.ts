import apiClient from '@/shared/utils/FetchUtils'
import type { ParsedApiError } from '@/shared/utils/FetchUtils'

export interface Profileinfo {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber?: string
  province?: string
  roleInSchool?: string
  school?: string
}

export interface UpdateUserDto {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  school?: string
  province?: string
  roleInSchool?: string
}

function isApiError(error: unknown): error is ParsedApiError {
  return typeof error === 'object' && error !== null && 'message' in error && 'status' in error
}

export const UserService = {
  async getMyUser(): Promise<Profileinfo> {
    try {
      const user = await apiClient.get<Profileinfo, Profileinfo>(`/users/me`)
      return user
    } catch (error) {
      if (isApiError(error)) {
        console.error(`[UserService.getMyUser] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[UserService.getMyUser] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while fetching user details.')
    }
  },
  async updateMyProfile(updateDto: UpdateUserDto): Promise<Profileinfo> {
    try {
      return await apiClient.patch<UpdateUserDto, Profileinfo>(`/users/me`, updateDto)
    } catch (error) {
      if (isApiError(error)) {
        console.error(`[UserService.updateMyProfile] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[UserService.updateMyProfile] Unexpected Error:', error)
      throw new Error('An unexpected error occurred during update.')
    }
  },

  async deleteMyProfile(): Promise<void> {
    try {
      await apiClient.delete<void>(`/users/me`)
    } catch (error) {
      if (isApiError(error)) {
        console.error(`[UserService.deleteMyProfile] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[UserService.deleteMyProfile] Unexpected Error:', error)
      throw new Error('An unexpected error occurred during deletion.')
    }
  },
}
