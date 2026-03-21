<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-vue-next'
import SelectStaff from '../components/SelectStaff.vue'
import SelectRole from '../components/SelectRole.vue'
import ConfirmationStaff from '../components/ConfirmationStaff.vue'

const isLoading = ref(false)
const router = useRouter()
const addModal = ref(false)
const step = ref(1)

// --- State Management ---
const selectedStaffIds = ref<string[]>([])
const selectedRoles = ref<string[]>([])
const selectedSession = ref('')

const staffList = ref([
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    roles: ['CHECKIN-MORNING', 'CHECKOUT-AFTERNOON'],
    session: 'AI with Prof.Siam',
  },
])

const allStaff = ref(
  Array.from({ length: 20 }, (_, i) => ({
    id: (i + 1).toString(),
    firstName: ['Somsak', 'Jane', 'John', 'Wichai', 'Ananda', 'Priya', 'Kevin'][i % 7],
    lastName: ['Sae-lee', 'Doe', 'Smith', 'Rattanapan', 'Everingham', 'Sharma', 'Lee'][i % 7],
    email: `staff${i + 1}@example.com`,
  })),
)

const selectedStaffNames = computed(() => {
  return allStaff.value
    .filter((s) => selectedStaffIds.value.includes(s.id))
    .map((s) => `${s.firstName} ${s.lastName}`)
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

const handleConfirmFinal = () => {
  isLoading.value = true
  // จำลองการยิง API
  console.log('Final Payload:', {
    ids: selectedStaffIds.value,
    roles: selectedRoles.value,
    session: selectedSession.value,
  })

  setTimeout(() => {
    isLoading.value = false
    addModal.value = false
    step.value = 1
    // ตรงนี้อาจจะเพิ่มการดึงข้อมูล staffList ใหม่จาก API
  }, 1500)
}

const nextProcess = () => {
  if (step.value < 3) {
    step.value += 1
  } else {
    handleConfirmFinal() // กดปุ่ม Confirm ใน Step 3 ให้เรียกฟังก์ชัน API
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
  if (step.value === 2) return selectedRoles.value.length === 0 || !selectedSession.value
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
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="(staff, index) in staffList"
                :key="staff.id"
                class="hover:bg-gray-50/80 transition-colors"
              >
                <td class="px-6 py-4 text-gray-500">{{ index + 1 }}</td>
                <td class="px-6 py-4 font-medium text-gray-900">
                  {{ staff.firstName }} {{ staff.lastName }}
                </td>
                <td class="px-6 py-4 text-gray-500">{{ staff.email }}</td>
                <td class="px-6 py-4 text-gray-600">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="role in staff.roles"
                      :key="role"
                      class="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100"
                    >
                      {{ formatEnum(role) }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-gray-900">{{ staff.session }}</td>
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
            :all-staff="allStaff"
            v-model:selectedIds="selectedStaffIds"
          />

          <SelectRole
            v-if="step === 2"
            :all-role="['CHECKIN-MORNING', 'CHECKOUT-AFTERNOON', 'GENERAL']"
            :all-session="['AI with Prof.Siam', 'Cloud Computing with Dr.Chen']"
            v-model:selectedRoles="selectedRoles"
            v-model:selectedSession="selectedSession"
            :selected-staff-names="selectedStaffNames"
          />

          <ConfirmationStaff
            v-if="step === 3"
            :selected-staff-names="selectedStaffNames"
            :selected-roles="selectedRoles"
            :selected-session="selectedSession"
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
  </div>
</template>
