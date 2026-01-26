import apiClient from '@/shared/utils/FetchUtils'
import type { ParsedApiError } from '@/shared/utils/FetchUtils'

export interface UserDetail {
  id: string
  email: string
  firstName: string
  lastName: string
  // เพิ่ม field อื่นๆ ตามที่ API return มาจริง
}

function isApiError(error: unknown): error is ParsedApiError {
  return typeof error === 'object' && error !== null && 'message' in error && 'status' in error
}

export const UserService = {
  async getUserById(id: string): Promise<UserDetail> {
    try {
      const user = await apiClient.get<UserDetail, UserDetail>(`/users/${id}`)
      return user
    } catch (error) {
      if (isApiError(error)) {
        console.error(`[UserService.getUserById] API Error ${error.status}: ${error.message}`)
        throw error
      }
      console.error('[UserService.getUserById] Unexpected Error:', error)
      throw new Error('An unexpected error occurred while fetching user details.')
    }
  }
}