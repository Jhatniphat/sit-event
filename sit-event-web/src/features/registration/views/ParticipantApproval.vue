<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { RegistrationService } from '@/features/registration/services/RegistrationService'
import { Check, X, ArrowLeft, Loader2, Settings2, Download } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const route = useRoute()
const router = useRouter()
const eventId = route.params.id as string

// --- Interfaces ---
interface ColumnDef {
  id: string
  label: string
  type: string
  isSystem: boolean
}

// Data
const columns = ref<ColumnDef[]>([])
const selectedColumnIds = ref<string[]>([])
const registrations = ref<any[]>([])
const isLoading = ref(true)
const isFetchingColumns = ref(true)

// --- Initialization ---
onMounted(async () => {
  await fetchColumns()
  // Default: Select All columns initially
  selectedColumnIds.value = columns.value.map(c => c.id)
  await fetchRegistrations()
})

// --- Actions ---
const fetchColumns = async () => {
  isFetchingColumns.value = true
  try {
    const data = await RegistrationService.getRegistrationColumns(eventId)
    columns.value = data
  } catch (error: any) {
    toast.error('Failed to load columns')
  } finally {
    isFetchingColumns.value = false
  }
}

const fetchRegistrations = async () => {
  isLoading.value = true
  try {
    // Separate selected columns into fields and questionIds
    const systemFields = columns.value
      .filter(c => c.isSystem && selectedColumnIds.value.includes(c.id))
      .map(c => c.id)

    const questionIds = columns.value
      .filter(c => !c.isSystem && selectedColumnIds.value.includes(c.id))
      .map(c => c.id)

    const data = await RegistrationService.getPendingRegistrations(
      eventId, 
      systemFields, 
      questionIds
    )
    registrations.value = data
  } catch (error: any) {
    toast.error(error.message || 'Failed to fetch registrations')
  } finally {
    isLoading.value = false
  }
}

const handleApprove = async (registrationId: string) => {
  try {
    await RegistrationService.approveRegistration(eventId, registrationId)
    toast.success('Registration approved')
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

const isExporting = ref(false)

const handleExport = async () => {
  isExporting.value = true
  try {
    const blob = await RegistrationService.exportRegistrations(eventId)
    
    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `registrations-${eventId}.xlsx`)
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    toast.success('Export successful')
  } catch (error: any) {
    console.error(error)
    toast.error('Failed to export')
  } finally {
    isExporting.value = false
  }
}

const toggleColumn = (colId: string) => {
  if (selectedColumnIds.value.includes(colId)) {
    selectedColumnIds.value = selectedColumnIds.value.filter(id => id !== colId)
  } else {
    selectedColumnIds.value.push(colId)
  }
}

const goBack = () => {
  router.back()
}

// --- Helpers ---
const formatDate = (dateStr: string) => {
  if(!dateStr) return '-'
  return new Date(dateStr).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const visibleColumns = computed(() => {
  return columns.value.filter(c => selectedColumnIds.value.includes(c.id))
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-4 md:p-8">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button 
            @click="goBack" 
            class="p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <h1 class="text-2xl font-bold">Participant Approval</h1>
        </div>

        <div class="flex items-center gap-2">
           <!-- Export Button -->
           <Button 
            variant="outline" 
            class="flex items-center gap-2"
            :disabled="isExporting"
            @click="handleExport"
           >
             <Loader2 v-if="isExporting" class="w-4 h-4 animate-spin" />
             <Download v-else class="w-4 h-4" />
             Export Excel
           </Button>

           <!-- Column Selector -->
           <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" class="flex items-center gap-2">
                <Settings2 class="w-4 h-4" />
                Customize Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-56" align="end">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div class="max-h-[300px] overflow-y-auto">
                <DropdownMenuCheckboxItem
                    v-for="col in columns" 
                    :key="col.id"
                    :checked="selectedColumnIds.includes(col.id)"
                    @select="(e: Event) => { e.preventDefault(); toggleColumn(col.id); }"
                >
                    {{ col.label }}
                </DropdownMenuCheckboxItem>
              </div>
              <DropdownMenuSeparator />
              <Button 
                variant="ghost" 
                class="w-full justify-center text-xs" 
                @click="fetchRegistrations"
              >
                Apply Changes
              </Button>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button @click="fetchRegistrations" variant="default" size="sm">
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        
        <!-- Loading State -->
        <div v-if="isLoading" class="p-12 flex justify-center items-center">
          <Loader2 class="w-8 h-8 animate-spin text-primary" />
        </div>

        <!-- Empty State -->
        <div v-else-if="registrations.length === 0" class="p-12 text-center text-gray-500">
          No pending registrations found.
        </div>

        <!-- Data Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 text-gray-600 font-medium border-b">
              <tr>
                <th class="px-6 py-4 whitespace-nowrap">Status</th>
                <th 
                    v-for="col in visibleColumns" 
                    :key="col.id"
                    class="px-6 py-4 whitespace-nowrap min-w-[150px]"
                >
                    {{ col.label }}
                </th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr 
                v-for="reg in registrations" 
                :key="reg.id"
                class="hover:bg-gray-50/50 transition-colors"
                :class="{ 'opacity-50 pointer-events-none': isLoading }"
              >
                <!-- Static Status Column -->
                <td class="px-6 py-4">
                  <Badge variant="outline" class="bg-yellow-50 text-yellow-700 border-yellow-200">
                    {{ reg.status }}
                  </Badge>
                </td>

                <!-- Dynamic Data Columns -->
                <td 
                    v-for="col in visibleColumns" 
                    :key="col.id"
                    class="px-6 py-4"
                >
                    <template v-if="col.type === 'DATE' || col.id === 'registeredAt'">
                        {{ formatDate(reg[col.id]) }}
                    </template>
                    <template v-else-if="col.type === 'CHECKBOX' && reg[col.id]">
                         <!-- Handle comma separated values if any -->
                         {{ reg[col.id] }}
                    </template>
                     <template v-else>
                        {{ reg[col.id] || '-' }}
                    </template>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <div class="flex justify-end gap-2">
                    <button 
                      @click="handleApprove(reg.id)"
                      class="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors"
                      title="Approve"
                    >
                      <Check class="w-5 h-5" />
                    </button>
                    <button 
                      @click="handleReject(reg.id)"
                      class="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                      title="Reject"
                    >
                      <X class="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific styles if needed */
</style>