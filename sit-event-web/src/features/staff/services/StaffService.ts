import apiClient from '@/shared/utils/FetchUtils'

export type StaffPermission = 'CHECK_IN' | 'VIEW_PARTICIPANTS';
export type StaffStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type UserRole = 'INTERNAL_STUDENT' | 'EXTERNAL_STUDENT' | 'STAFF' | 'ADMIN'; // เพิ่มตามที่มีในระบบ
export type EventStaffStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  school: string | null;
  userRole: UserRole;
  age: number | null;
  province: string | null;
  roleInSchool: string | null;
  dietaryRequirements: string | null;
  notificationPreferences: boolean;
  createdAt: string; // ISO Date String
  updatedAt: string; // ISO Date String
}

export interface StaffMember {
  id: string;
  userId: string;
  eventId: string;
  eventRole: string; // เช่น "STAFF"
  status: EventStaffStatus;
  createdAt: string; // ISO Date String
  user: UserDetail;
}

// ถ้าเป็น Array แบบที่ส่งมาใน Proxy
export type StaffMemberArray = StaffMember[];

export interface StaffScope {
  id: string;
  staffId: string;
  permission: StaffPermission;
  sessionId: string | null;
  staff?: {
    id: string;
    eventId: string;
    userId: string;
    status: StaffStatus;
    event: {
      id: string;
      name: string;
    };
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
  session: {
    id: string;
    name: string;
  } | null;
}

export interface UpdateStaffScopeDto {
  permission: StaffPermission;
  sessionId?: string | null; 
}

const handleServiceError = (error: any, methodName: string) => {
  console.error(`[StaffService.${methodName}] Error:`, error)
  throw error
}

export const StaffService = {

async getAllStaffScope(): Promise<StaffScope[]> {
    try {
      const result = await apiClient.get<StaffScope[]>(
        '/event-staffs/scopes',
      )
      console.log('[StaffService.getAllStaffScope] Fetched scopes:', result.data)
      return result.data
    } catch (error) {
      return handleServiceError(error, 'getAllStaffScopes')
    }
  },
  async getScopesByStaffId(staffId: string): Promise<StaffScope[]> {
    try {
      const result = await apiClient.get<StaffScope[]>(`/event-staffs/${staffId}/scopes`)
      return result.data
    } catch (error) {
      return handleServiceError(error, 'getScopesByStaffId')
    }
  },
  async addStaffScope(staffId: string, data: UpdateStaffScopeDto): Promise<void> {
    try {
      await apiClient.post(`/event-staffs/${staffId}/scopes`, data)
      console.log(`[StaffService.addStaffScope] Added scope for staffId=${staffId} with data=`, data)
    } catch (error) {
      return handleServiceError(error, 'addStaffScope')
    }
  },
  async deleteStaffScope(scopeId: string): Promise<void> {
    try {
      return await apiClient.delete(`/event-staffs/scopes/${scopeId}`)
    } catch (error) {
      return handleServiceError(error, 'deleteStaffScope')
    }
  },
  async getAllStaff(eventId: string): Promise<StaffMemberArray> {
    try {
      return await apiClient.get(`/events/${eventId}/staffs`)
    } catch (error) {
      return handleServiceError(error, 'getAllStaff')
    }
  }
}

