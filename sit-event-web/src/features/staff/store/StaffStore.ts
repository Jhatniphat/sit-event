import { ref } from 'vue'
import { defineStore } from 'pinia'
import { StaffService } from '../services/StaffService'
import type { StaffMemberArray, StaffScope, UpdateStaffScopeDto } from '../services/StaffService'

export const useStaffStore = defineStore('staff', () => {
  // --- State ---
  const allScopes = ref<StaffScope[]>([])
  const currentStaffScopes = ref<StaffScope[]>([])
  const allStaff = ref<StaffMemberArray>([]) 
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // --- Actions ---

  /**
   * ดึง Scope ทั้งหมด (Admin View)
   */
  const fetchAllScopes = async () => {
    isLoading.value = true
    error.value = null
    try {
      const result = await StaffService.getAllStaffScope()
      allScopes.value = result
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch all scopes'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * ดึง Scope ของพนักงานรายบุคคล
   */
  const fetchScopesByStaff = async (staffId: string) => {
    isLoading.value = true
    error.value = null
    try {
      currentStaffScopes.value = await StaffService.getScopesByStaffId(staffId)
        console.log(`[StaffStore] Fetched scopes for staff ${staffId}:`, currentStaffScopes.value)
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch staff scopes'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * เพิ่ม Permission ให้พนักงาน (รองรับ Bulk Update)
   * @param staffIds รายชื่อ ID พนักงานที่เลือกจาก Step 1
   * @param scopeData ข้อมูล Role และ Session จาก Step 2
   */
  const bulkAddStaffScopes = async (staffIds: string[], scopeData: UpdateStaffScopeDto[]) => {
    isLoading.value = true
    error.value = null
    try {
      // ใช้ Promise.all เพื่อยิง API ขนานกันสำหรับพนักงานทุกคน และทุก Role ที่เลือก
      const promises = staffIds.flatMap(staffId => 
        scopeData.map(data => StaffService.addStaffScope(staffId, data))
      )
      
      await Promise.all(promises)
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to assign some permissions'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * ลบ Permission
   */
  const removeScope = async (scopeId: string) => {
    isLoading.value = true
    error.value = null
    try {
      await StaffService.deleteStaffScope(scopeId)
      // Update state ในเครื่องทันทีไม่ต้องโหลดใหม่
      allScopes.value = allScopes.value.filter(s => s.id !== scopeId)
      currentStaffScopes.value = currentStaffScopes.value.filter(s => s.id !== scopeId)
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to remove scope'
      return false
    } finally {
      isLoading.value = false
    }
  }

  const fetchAllStaff = async (eventId: string) => {
    isLoading.value = true
    error.value = null
    try {
      const staffList = await StaffService.getAllStaff(eventId)
      allStaff.value = staffList
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch all staff'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    allScopes,
    allStaff,
    currentStaffScopes,
    isLoading,
    error,
    // Actions
    fetchAllScopes,
    fetchScopesByStaff,
    bulkAddStaffScopes,
    removeScope,
    fetchAllStaff,
  }
})