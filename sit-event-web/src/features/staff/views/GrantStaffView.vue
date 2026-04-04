<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStaffStore } from '../store/StaffStore'
import type { StaffPermission, StaffScope } from '../services/StaffService'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, X, Pencil, UserCircle } from 'lucide-vue-next'
import SelectStaff from '../components/SelectStaff.vue'
import SelectRole from '../components/SelectRole.vue'
import ConfirmationStaff from '../components/ConfirmationStaff.vue'
import { toast } from 'vue-sonner'
import { useEventStore } from '@/features/event_management/store/EventStore'

const router = useRouter()
const route = useRoute()
const staffStore = useStaffStore()
const eventStore = useEventStore()

// --- State Management ---
const addModal = ref(false)
const editModal = ref(false)
const deleteModal = ref(false)
const step = ref(1)
const eventId = route.params.id as string
const selectedStaffIds = ref<string[]>([])
const selectedRoles = ref<string[]>([])
const selectedSession = ref('')
const availableRoles = ['CHECK_IN', 'VIEW_PARTICIPANTS']
const editingScopeId = ref<StaffScope['id'] | null>(null)
const editingStaffName = ref('')
const staffIdToDelete = ref('')

onMounted(async () => {
  await staffStore.fetchAllScopes()
  await staffStore.fetchAllStaff(eventId)
  await eventStore.fetchEventSessions(eventId)
})

const staffScopesList = computed(() => staffStore.allScopes || [])
const rawStaffList = computed(() => staffStore.allStaff || [])
const sessionsList = computed(() => eventStore.currentEventSessions || [])
const isLoading = computed(() => staffStore.isLoading)

const filteredStaffList = computed(() => {
  if (!rawStaffList.value) return []

  // 1. ดึง staffId ทั้งหมดที่มีอยู่ในตารางสิทธิ์ปัจจุบันออกมาเป็น Set (เพื่อความเร็วในการค้นหา)
  const existingStaffIds = new Set(staffScopesList.value.map((scope) => scope.staffId))

  // 2. กรองรายชื่อพนักงานทั้งหมด โดยเอาเฉพาะคนที่ ID ไม่อยู่ใน Set ข้อ 1
  return rawStaffList.value.filter((staff) => !existingStaffIds.has(staff.id))
})

const selectedStaffNames = computed(() => {
  if (!rawStaffList.value) return []
  return rawStaffList.value
    .filter((s) => selectedStaffIds.value.includes(s.id))
    .map((s) => `${s.user?.firstName || ''} ${s.user?.lastName || ''}`)
})

const selectedSessionName = computed(() => {
  if (!selectedSession.value) return 'Event-wide'
  const found = sessionsList.value.find((s) => s.id === selectedSession.value)
  return found ? found.name : selectedSession.value
})

const formatEnum = (value: string) => {
  if (!value) return '-'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// --- Logic Actions ---
const AddNewPermission = () => {
  step.value = 1
  selectedStaffIds.value = []
  selectedRoles.value = []
  selectedSession.value = ''
  addModal.value = true
}

const editStaffScope = (scope: StaffScope) => {
  editingScopeId.value = scope.id
  editingStaffName.value = `${scope.staff?.user.firstName} ${scope.staff?.user.lastName}`

  // Set ค่าเริ่มต้นใน Modal ให้ตรงกับข้อมูลที่มีอยู่
  selectedRoles.value = [scope.permission]
  selectedSession.value = scope.sessionId || ''

  editModal.value = true
}

const confirmDelete = (staffId: string) => {
  staffIdToDelete.value = staffId
  deleteModal.value = true
}

const handleExecuteDelete = async () => {
  if (!staffIdToDelete.value) return

  const success = await staffStore.removeScope(staffIdToDelete.value)
  if (success) {
    toast.success('Permission removed successfully')
    deleteModal.value = false
    staffIdToDelete.value = ''
    await staffStore.fetchAllScopes()
  } else {
    toast.error(staffStore.error || 'Failed to remove permission')
  }
}

const handleConfirmFinal = async () => {
  const scopePayload = selectedRoles.value.map((role) => ({
    permission: role as StaffPermission,
    sessionId: selectedSession.value || null,
  }))

  const success = await staffStore.bulkAddStaffScopes(selectedStaffIds.value, scopePayload)

  if (success) {
    addModal.value = false
    step.value = 1
    await staffStore.fetchAllScopes()
    toast.success('Permissions updated successfully')
  } else {
    toast.error(staffStore.error || 'Failed to update permissions')
  }
}

const handleUpdateFinal = async () => {
  if (!editingScopeId.value) return
  try {
    // 1. หาข้อมูล Backup ไว้ก่อนเลย (ห้ามสลับบรรทัด!)
    const scopeToUpdate = staffStore.allScopes.find((s) => s.id === editingScopeId.value)

    if (!scopeToUpdate?.staffId) {
      toast.error('Could not find staff information')
      return
    }

    // 2. ลบ Permission เก่าออก
    await staffStore.removeScope(editingScopeId.value)

    // 3. เตรียม Payload ใหม่
    const scopePayload = selectedRoles.value.map((role) => ({
      permission: role as StaffPermission,
      sessionId: selectedSession.value || null,
    }))

    // 4. เพิ่ม Permission ใหม่ โดยใช้ staffId ที่เรา Backup ไว้ในข้อ 1
    // หมายเหตุ: ใช้ scopeToUpdate.staffId (จากข้อมูลดิบ)
    // หรือ scopeToUpdate.staff.id ตามโครงสร้างที่ API คืนมา
    const staffId = scopeToUpdate.staffId

    await staffStore.bulkAddStaffScopes([staffId], scopePayload)

    toast.success('Permission updated successfully')
    editModal.value = false
    await staffStore.fetchAllScopes() // รีโหลดตารางใหม่
  } catch (error) {
    console.error(error)
    toast.error('Failed to update permission')
  }
}

const nextProcess = () => {
  if (step.value < 3) {
    step.value += 1
  } else {
    handleConfirmFinal()
  }
}

const cancelAdd = () => {
  if (step.value > 1) {
    step.value -= 1
    return
  }
  addModal.value = false
}

const isNextDisabled = computed(() => {
  if (step.value === 1) return selectedStaffIds.value.length === 0
  if (step.value === 2) return selectedRoles.value.length === 0
  return false
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-8">
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="flex flex-row items-center gap-2">
          <button
            @click="router.back()"
            class="p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <h1 class="text-2xl font-bold tracking-tight text-gray-900">Staff Management</h1>
        </div>
        <Button @click="AddNewPermission()" variant="default"> + New Permission </Button>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
              <tr>
                <th class="px-6 py-4 w-[60px]">No</th>
                <th class="px-6 py-4">Name</th>
                <th class="px-6 py-4">Email</th>
                <th class="px-6 py-4">Role</th>
                <th class="px-6 py-4">Session</th>
                <th class="px-6 py-4 w-[50px]"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-if="staffScopesList.length === 0">
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                  <div class="flex flex-col items-center gap-2">
                    <UserCircle class="w-8 h-8 text-gray-400" />
                    No staff permissions found.
                  </div>
                </td>
              </tr>
              <tr
                v-else
                v-for="(staff, index) in staffScopesList"
                :key="staff.id"
                class="hover:bg-gray-50/80 transition-colors"
              >
                <td class="px-6 py-4 text-gray-500">{{ index + 1 }}</td>
                <td class="px-6 py-4 font-medium text-gray-900">
                  {{ staff.staff?.user.firstName }} {{ staff.staff?.user.lastName }}
                </td>
                <td class="px-6 py-4 text-gray-500">{{ staff.staff?.user.email }}</td>
                <td class="px-6 py-4 text-gray-600">
                  <div class="flex flex-wrap gap-1">
                    <span
                      class="px-2 p-1 rounded-lg text-xs bg-blue-50 text-blue-500 border border-blue-100 font-bold"
                    >
                      {{ formatEnum(staff.permission) }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-gray-900">
                  <div class="flex flex-wrap gap-1">
                    <span
                      class="px-2 p-1 rounded-lg text-xs bg-purple-50 text-purple-500 border border-purple-100 font-bold"
                    >
                      {{ staff.session?.name ? staff.session.name : 'Event-Wide' }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 w-[50px] text-right">
                  <div class="flex flex-row">
                    <button
                      @click="editStaffScope(staff)"
                      class="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Pencil class="w-4 h-4" />
                    </button>
                    <button
                      @click="confirmDelete(staff.id)"
                      class="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                    >
                      <X class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div
      v-if="addModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b shrink-0 flex justify-between items-center">
          <div>
            <h3 class="font-bold text-gray-900 text-xl">Add New Permission</h3>
            <p class="text-xs text-gray-400 mt-1">Step {{ step }} of 3</p>
          </div>
        </div>

        <div class="p-6 overflow-y-auto flex-1">
          <SelectStaff
            v-if="step === 1"
            :all-staff="filteredStaffList"
            v-model:selectedIds="selectedStaffIds"
          />

          <SelectRole
            v-if="step === 2"
            :all-role="availableRoles"
            :all-session="sessionsList"
            v-model:selectedRoles="selectedRoles"
            v-model:selectedSession="selectedSession"
            :selected-staff-names="selectedStaffNames"
          />

          <ConfirmationStaff
            v-if="step === 3"
            :selected-staff-names="selectedStaffNames"
            :selected-roles="selectedRoles"
            :selected-session="selectedSessionName"
          />
        </div>

        <div class="p-6 border-t flex justify-end gap-3 shrink-0">
          <button
            @click="cancelAdd()"
            class="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            {{ step === 1 ? 'Cancel' : 'Back' }}
          </button>

          <Button
            @click="nextProcess()"
            :variant="step === 3 ? 'default' : 'outline'"
            class="min-w-[120px] font-bold shadow-sm"
            :class="{ 'bg-black text-white hover:bg-gray-800': step === 3 }"
            :disabled="isNextDisabled || isLoading"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
            {{ step === 3 ? 'Confirm & Grant' : 'Next Step' }}
          </Button>
        </div>
      </div>
    </div>

    <div
      v-if="editModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 text-left"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b shrink-0 flex justify-between items-center">
          <div>
            <h3 class="font-bold text-gray-900 text-xl">Edit Permission</h3>
            <p class="text-xs text-gray-400 mt-1">Modifying access for {{ editingStaffName }}</p>
          </div>
          <button @click="editModal = false" class="p-2 hover:bg-gray-100 rounded-full">
            <X class="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div class="p-6 overflow-y-auto flex-1">
          <SelectRole
            :all-role="availableRoles"
            :all-session="sessionsList"
            v-model:selectedRoles="selectedRoles"
            v-model:selectedSession="selectedSession"
            :selected-staff-names="[editingStaffName]"
          />
        </div>

        <div class="p-6 border-t flex justify-end gap-3 shrink-0">
          <button
            @click="editModal = false"
            class="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>

          <Button
            @click="handleUpdateFinal"
            class="min-w-[120px] font-bold shadow-sm bg-black text-white hover:bg-gray-800"
            :disabled="selectedRoles.length === 0 || isLoading"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
    <div
      v-if="deleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
        <p class="text-gray-500">
          Are you sure you want to remove this permission? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-3 pt-2">
          <button
            @click="deleteModal = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="handleExecuteDelete()"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
