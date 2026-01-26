<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { RegistrationService } from '@/features/registration/services/RegistrationService'
import { Check, X, ArrowLeft, Loader2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const eventId = route.params.id as string

// --- Interfaces ตรงกับ JSON Response ---
interface UserInfo {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface SessionInfo {
  id: string
  name: string
  // field อื่นๆ ถ้าจำเป็น
}

interface PendingRegistration {
  id: string
  userId: string
  eventId: string
  sessionId: string | null
  status: string
  registeredAt: string
  user: UserInfo      // ข้อมูล User ที่แนบมาใน response
  session: SessionInfo | null // ข้อมูล Session (ถ้ามี)
}

const registrations = ref<PendingRegistration[]>([])
const isLoading = ref(true)

// --- Actions ---
const fetchPendingRegistrations = async () => {
  isLoading.value = true
  try {
    // Response มี user object มาให้แล้ว ไม่ต้อง map ไปดึงเพิ่ม
    const data = await RegistrationService.getPendingRegistrations(eventId)
    registrations.value = data as unknown as PendingRegistration[]
  } catch (error: any) {
    toast.error(error.message || 'Failed to fetch pending registrations')
  } finally {
    isLoading.value = false
  }
}

const handleApprove = async (registrationId: string) => {
  try {
    await RegistrationService.approveRegistration(eventId, registrationId)
    toast.success('Registration approved')
    // ลบรายการที่ทำรายการแล้วออกจาก list
    registrations.value = registrations.value.filter(r => r.id !== registrationId)
  } catch (error: any) {
    toast.error(error.message || 'Failed to approve')
  }
}

const handleReject = async (registrationId: string) => {
  try {
    await RegistrationService.rejectRegistration(eventId, registrationId)
    toast.success('Registration rejected')
    registrations.value = registrations.value.filter(r => r.id !== registrationId)
  } catch (error: any) {
    toast.error(error.message || 'Failed to reject')
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  fetchPendingRegistrations()
})

// --- Helpers ---
const formatDate = (dateStr: string | Date) => {
  return new Date(dateStr).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-8">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <div class="flex items-center gap-4">
        <button 
          @click="goBack" 
          class="p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft class="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Participant Approval</h1>
          <p class="text-muted-foreground text-gray-500 mt-1">
            Review and manage pending registration requests.
          </p>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
              <tr>
                <th class="px-6 py-4">User Name</th>
                <th class="px-6 py-4">Context</th> <th class="px-6 py-4">Email</th>
                <th class="px-6 py-4">Registered At</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              
              <tr v-if="isLoading">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                  <div class="flex flex-col items-center gap-2">
                    <Loader2 class="w-8 h-8 animate-spin text-blue-500" />
                    <span>Loading pending requests...</span>
                  </div>
                </td>
              </tr>

              <tr v-else-if="registrations.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                  No pending registrations found.
                </td>
              </tr>

              <tr 
                v-for="reg in registrations" 
                :key="reg.id"
                class="hover:bg-gray-50/80 transition-colors"
              >
                <td class="px-6 py-4 font-medium text-gray-900">
                   {{ reg.user?.firstName }} {{ reg.user?.lastName }}
                </td>
                
                <td class="px-6 py-4 text-gray-600">
                    <span v-if="reg.session" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                      Session: {{ reg.session.name }}
                    </span>
                    <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                      Main Event
                    </span>
                </td>

                <td class="px-6 py-4 text-gray-600">
                  {{ reg.user?.email || '-' }}
                </td>

                <td class="px-6 py-4 text-gray-600">
                  {{ formatDate(reg.registeredAt) }}
                </td>

                <td class="px-6 py-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {{ reg.status }}
                  </span>
                </td>

                <td class="px-6 py-4 text-right space-x-2">
                  <button 
                    @click="handleApprove(reg.id)"
                    class="inline-flex items-center justify-center p-2 rounded-md text-green-600 hover:bg-green-50 border border-transparent hover:border-green-200 transition-all"
                    title="Approve"
                  >
                    <Check class="w-5 h-5" />
                  </button>
                  <button 
                    @click="handleReject(reg.id)"
                    class="inline-flex items-center justify-center p-2 rounded-md text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                    title="Reject"
                  >
                    <X class="w-5 h-5" />
                  </button>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  </div>
</template>