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
  // เพิ่ม field อื่นๆ ตามที่ API return มาจริง
}

function isApiError(error: unknown): error is ParsedApiError {
  return typeof error === 'object' && error !== null && 'message' in error && 'status' in error
}

export const UserService = {
  async getMyUser(): Promise<Profileinfo> {
    try {
      const user = await apiClient.get<Profileinfo, Profileinfo>(`/users/me`)
      console.log('Fetched user details:', user)
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
}
