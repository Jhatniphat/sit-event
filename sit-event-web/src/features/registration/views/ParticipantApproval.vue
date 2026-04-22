<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { RegistrationService } from '@/features/registration/services/RegistrationService'
import { EventService } from '@/features/event_management/services/EventServices'
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

const eventConfig = ref<any>(null)
const sessionConfigs = ref<any>({})
const currentApprovedCounts = ref<Record<string, number>>({})
const capacityData = ref<any>(null)

const decisions = ref<Record<string, 'APPROVE' | 'REJECT'>>({})
const isSubmitting = ref(false)
const showConfirmModal = ref(false)

const stagedApprovals = computed(() => Object.keys(decisions.value).filter(k => decisions.value[k] === 'APPROVE'))
const stagedRejects = computed(() => Object.keys(decisions.value).filter(k => decisions.value[k] === 'REJECT'))

// --- Initialization ---
onMounted(async () => {
  await fetchEventConfig()
  await fetchApprovedCounts()
  await fetchCapacity()
  await fetchColumns()
  selectedColumnIds.value = columns.value.map(c => c.id)
  await fetchRegistrations()
})

const fetchEventConfig = async () => {
  try {
    const evt = await EventService.getEventById(eventId)
    eventConfig.value = evt
    const sessions = await EventService.getEventSessions(eventId)
    sessions.forEach(s => {
      sessionConfigs.value[s.id] = s
    })
  } catch (error) {
    console.error('Failed to fetch event logic', error)
  }
}

const fetchApprovedCounts = async () => {
  try {
    const pEvent = await EventService.participantsForEvent(eventId)
    currentApprovedCounts.value['main'] = pEvent.summary.totalApproved

    for (const sessionId of Object.keys(sessionConfigs.value)) {
      const pSession = await EventService.participantsForSession(eventId, sessionId)
      currentApprovedCounts.value[sessionId] = pSession.summary.totalApproved
    }
  } catch (error) {
    console.error('Failed to fetch current counts', error)
  }
}

const fetchCapacity = async () => {
  try {
    const data = await RegistrationService.getRegistrationCapacity(eventId)
    capacityData.value = data
  } catch(error) {
    console.error('Failed to fetch capacity', error)
  }
}

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
    decisions.value = {}
  } catch (error: any) {
    toast.error(error.message || 'Failed to fetch registrations')
  } finally {
    isLoading.value = false
  }
}

// Group registrations by User
const groupedRegistrations = computed(() => {
  const map = new Map<string, any>()
  registrations.value.forEach(reg => {
    if (!map.has(reg.userId)) {
      map.set(reg.userId, {
        userId: reg.userId,
        mainEvent: null,
        sessions: []
      })
    }
    const group = map.get(reg.userId)
    if (reg.isMainEvent) {
      group.mainEvent = reg
    } else {
      group.sessions.push(reg)
    }
  })
  
  // Return users who have a main event registration pending OR some sessions pending
  return Array.from(map.values())
})

const getSeatType = (regId: string) => {
  const reg = registrations.value.find(r => r.id === regId)
  if (!reg) return null
  
  // Calculate order 
  const allStaged = stagedApprovals.value
    .map(id => registrations.value.find(r => r.id === id)!)
    .filter(r => r && (reg.isMainEvent ? r.isMainEvent : r.sessionId === reg.sessionId))
    .sort((a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime())
    
  const index = allStaged.findIndex(r => r.id === regId)
  if (index === -1) return null
  
  const currentTotal = reg.isMainEvent 
    ? currentApprovedCounts.value['main'] || 0
    : currentApprovedCounts.value[reg.sessionId] || 0
    
  const config = reg.isMainEvent ? eventConfig.value : sessionConfigs.value[reg.sessionId]
  if (!config || config.maxSeats === null) return 'NORMAL'
  
  const totalWithMe = currentTotal + index + 1
  if (totalWithMe <= config.maxSeats) {
    return 'NORMAL'
  } else if (config.maxReserveSeats && totalWithMe <= config.maxSeats + config.maxReserveSeats) {
    return 'RESERVE'
  } else {
    return 'EXCEEDED'
  }
}

const isCapacityFull = (reg: any) => {
  if (!capacityData.value) return false;
  const cap = reg.isMainEvent ? capacityData.value.mainEvent : capacityData.value.sessions[reg.sessionId];
  if (!cap || cap.maxSeats === null) return false;
  
  const limit = cap.maxSeats + (cap.maxReserveSeats || 0);

  // Consider currently staged approvals for the same scope
  const stagedCount = stagedApprovals.value.filter(id => {
       if (id === reg.id) return false; // don't count itself
       const r = registrations.value.find(rx => rx.id === id);
       return r && (reg.isMainEvent ? r.isMainEvent : r.sessionId === reg.sessionId);
  }).length;
  
  const currentUsed = cap.approvedCount + cap.reservedCount + stagedCount;

  return currentUsed >= limit;
}

const setDecision = (reg: any, group: any, type: 'APPROVE' | 'REJECT') => {
  // block approve session if main event not approved
  if (type === 'APPROVE' && !reg.isMainEvent && group.mainEvent && decisions.value[group.mainEvent.id] !== 'APPROVE') {
     toast.warning('Must approve main event first')
     // uncheck the radio by resetting reactivity
     decisions.value = { ...decisions.value }
     return;
  }
  
  const newDecisions = { ...decisions.value, [reg.id]: type }
  
  // cascading logics for REJECT mainEvent -> clean/reject sessions
  if (reg.isMainEvent && type === 'REJECT') {
     group.sessions.forEach((s: any) => {
         if (newDecisions[s.id] === 'APPROVE') {
             delete newDecisions[s.id]
         }
     })
  }
  
  decisions.value = newDecisions
}

const submitBatch = async () => {
    isSubmitting.value = true
    try {
        // Sort approvals by registration time to fulfill first-come-first-serve max seats
        const approvedRegsForSorting = stagedApprovals.value.map(id => registrations.value.find(r => r.id === id)!);
        approvedRegsForSorting.sort((a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime());
        const approvedIds = approvedRegsForSorting.map(r => r.id);
        const rejectedIds = stagedRejects.value
        
        // Approve sequentially to not overwhelm the database
        for (const id of approvedIds) {
           await RegistrationService.approveRegistration(eventId, id)
        }
        for (const id of rejectedIds) {
           await RegistrationService.rejectRegistration(eventId, id)
        }
        toast.success(`Successfully processed ${approvedIds.length + rejectedIds.length} operations.`)
        showConfirmModal.value = false
        await fetchApprovedCounts() // update counts
        await fetchCapacity() // update counts accurately
        await fetchRegistrations() // refetch pending
    } catch(err: any) {
        toast.error('Error processing batch: ' + err.message)
    } finally {
        isSubmitting.value = false
    }
}

const visibleColumns = computed(() => {
  return columns.value.filter(c => selectedColumnIds.value.includes(c.id))
})

const formatDate = (dateStr: string) => {
  if(!dateStr) return '-'
  return new Date(dateStr).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const isExporting = ref(false)
const handleExport = async () => {
  isExporting.value = true
  try {
    const blob = await RegistrationService.exportRegistrations(eventId)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `registrations-${eventId}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.success('Export successful')
  } catch (error: any) {
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
const goBack = () => router.back()
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-4 md:p-8">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="goBack" class="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <ArrowLeft class="w-5 h-5" />
          </button>
          <h1 class="text-2xl font-bold">Participant Approval</h1>
        </div>

        <div class="flex items-center gap-2">
           <Button variant="outline" class="flex items-center gap-2" :disabled="isExporting" @click="handleExport">
             <Loader2 v-if="isExporting" class="w-4 h-4 animate-spin" />
             <Download v-else class="w-4 h-4" />
             Export Excel
           </Button>

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
              <Button variant="ghost" class="w-full justify-center text-xs" @click="fetchRegistrations">
                Apply Changes
              </Button>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button id="open-confirm-modal-btn" @click="showConfirmModal = true" variant="default" size="sm" :disabled="stagedApprovals.length === 0 && stagedRejects.length === 0">
            Confirm Selection ({{ stagedApprovals.length + stagedRejects.length }})
          </Button>
        </div>
      </div>

      <!-- Capacity Display -->
      <div v-if="capacityData" class="flex flex-wrap gap-6 text-sm p-4 bg-white rounded-lg shadow-sm border">
        <div class="space-y-1">
            <div class="font-semibold text-gray-700">Main Event Capacity</div>
            <div v-if="capacityData.mainEvent?.maxSeats !== null" class="flex gap-4">
                <span class="text-blue-600 font-medium">Seats: {{ capacityData.mainEvent.approvedCount }} / {{ capacityData.mainEvent.maxSeats }}</span>
                <span v-if="capacityData.mainEvent.maxReserveSeats !== null" class="text-orange-600 font-medium">Reserve: {{ capacityData.mainEvent.reservedCount }} / {{ capacityData.mainEvent.maxReserveSeats }}</span>
            </div>
            <div v-else class="text-gray-500">Unlimited</div>
        </div>
        
        <div v-for="(sessionCap, sId) in capacityData.sessions" :key="sId" class="space-y-1 border-l pl-6">
            <div class="font-semibold text-gray-700">{{ sessionConfigs[sId]?.name || 'Session' }} Capacity</div>
            <div v-if="sessionCap.maxSeats !== null" class="flex gap-4">
                <span class="text-blue-600 font-medium">Seats: {{ sessionCap.approvedCount }} / {{ sessionCap.maxSeats }}</span>
                <span v-if="sessionCap.maxReserveSeats !== null" class="text-orange-600 font-medium">Reserve: {{ sessionCap.reservedCount }} / {{ sessionCap.maxReserveSeats }}</span>
            </div>
            <div v-else class="text-gray-500">Unlimited</div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div v-if="isLoading" class="p-12 flex justify-center items-center">
          <Loader2 class="w-8 h-8 animate-spin text-primary" />
        </div>
        <div v-else-if="groupedRegistrations.length === 0" class="p-12 text-center text-gray-500">
          No pending registrations found.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 text-gray-600 font-medium border-b">
              <tr>
                <th class="px-6 py-4 whitespace-nowrap">Decision</th>
                <th class="px-6 py-4 whitespace-nowrap">Event/Session</th>
                <th class="px-6 py-4 whitespace-nowrap">Seat Status</th>
                <th v-for="col in visibleColumns" :key="col.id" class="px-6 py-4 whitespace-nowrap min-w-[150px]">
                    {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <template v-for="group in groupedRegistrations" :key="group.userId">
                <!-- Main Event Row -->
                <tr v-if="group.mainEvent" class="bg-blue-50/20 hover:bg-blue-50/50 transition-colors">
                  <td class="px-6 py-4 space-x-4 min-w-[160px]">
                     <label class="inline-flex items-center gap-1.5 cursor-pointer" :class="{ 'opacity-50 cursor-not-allowed': isCapacityFull(group.mainEvent) }">
                        <input type="radio" :name="'decision-'+group.mainEvent.id" value="APPROVE" :checked="decisions[group.mainEvent.id] === 'APPROVE'" @change="setDecision(group.mainEvent, group, 'APPROVE')" :disabled="isCapacityFull(group.mainEvent)" class="w-4 h-4 text-green-600 focus:ring-green-500" />
                        <span class="text-xs font-medium text-green-700">Approve</span>
                     </label>
                     <label class="inline-flex items-center gap-1.5 cursor-pointer" :class="{ 'opacity-50 cursor-not-allowed': isCapacityFull(group.mainEvent) }">
                        <input type="radio" :name="'decision-'+group.mainEvent.id" value="REJECT" :checked="decisions[group.mainEvent.id] === 'REJECT'" @change="setDecision(group.mainEvent, group, 'REJECT')" :disabled="isCapacityFull(group.mainEvent)" class="w-4 h-4 text-red-600 focus:ring-red-500" />
                        <span class="text-xs font-medium text-red-700">Reject</span>
                     </label>
                  </td>
                  <td class="px-6 py-4 font-semibold text-blue-900 border-l-4 border-blue-500">
                    Main Event
                  </td>
                  <td class="px-6 py-4">
                    <Badge v-if="decisions[group.mainEvent.id] === 'APPROVE'" :variant="getSeatType(group.mainEvent.id) === 'NORMAL' ? 'default' : 'destructive'">
                      {{ getSeatType(group.mainEvent.id) }} SEAT
                    </Badge>
                  </td>
                  <td v-for="col in visibleColumns" :key="col.id" class="px-6 py-4">
                    <template v-if="col.type === 'DATE' || col.id === 'registeredAt'">
                        {{ formatDate(group.mainEvent[col.id]) }}
                    </template>
                    <template v-else-if="col.type === 'CHECKBOX' && group.mainEvent[col.id]">
                         {{ group.mainEvent[col.id] }}
                    </template>
                     <template v-else>
                        {{ group.mainEvent[col.id] || '-' }}
                    </template>
                  </td>
                </tr>
                
                <!-- Sub Session Rows -->
                <tr v-for="session in group.sessions" :key="session.id" class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4 space-x-4 pl-12 line-through-sub min-w-[160px]">
                     <label class="inline-flex items-center gap-1.5 cursor-pointer" :class="{ 'opacity-50 cursor-not-allowed': isCapacityFull(session) || (group.mainEvent && decisions[group.mainEvent.id] !== 'APPROVE') }">
                        <input type="radio" :name="'decision-'+session.id" value="APPROVE" :checked="decisions[session.id] === 'APPROVE'" @change="setDecision(session, group, 'APPROVE')" :disabled="isCapacityFull(session) || (group.mainEvent && decisions[group.mainEvent.id] !== 'APPROVE')" class="w-4 h-4 text-green-600 focus:ring-green-500" />
                        <span class="text-xs font-medium text-green-700">Approve</span>
                     </label>
                     <label class="inline-flex items-center gap-1.5 cursor-pointer" :class="{ 'opacity-50 cursor-not-allowed': isCapacityFull(session) }">
                        <input type="radio" :name="'decision-'+session.id" value="REJECT" :checked="decisions[session.id] === 'REJECT'" @change="setDecision(session, group, 'REJECT')" :disabled="isCapacityFull(session)" class="w-4 h-4 text-red-600 focus:ring-red-500" />
                        <span class="text-xs font-medium text-red-700">Reject</span>
                     </label>
                  </td>
                   <td class="px-6 py-4 text-gray-700 pl-10 border-l border-gray-200">
                    ⌊ Sub-session: {{ session.sessionName }}
                  </td>
                  <td class="px-6 py-4">
                    <Badge v-if="decisions[session.id] === 'APPROVE'" :variant="getSeatType(session.id) === 'NORMAL' ? 'default' : 'destructive'">
                      {{ getSeatType(session.id) }} SEAT
                    </Badge>
                  </td>
                  <!-- Sub sessions do not show data columns as requested -->
                  <td :colspan="visibleColumns.length" class="px-6 py-4 text-gray-400 italic">
                      (Details inherited from Main Event)
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Confirm Modal -->
    <div v-if="showConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 space-y-6">
            <h2 class="text-xl font-bold">Confirm Decisions</h2>
            <div class="space-y-4">
               <div class="p-4 bg-green-50 text-green-900 rounded-lg">
                  <span class="font-semibold block">Will Approve: {{ stagedApprovals.length }}</span>
               </div>
               <div class="p-4 bg-red-50 text-red-900 rounded-lg">
                  <span class="font-semibold block">Will Reject: {{ stagedRejects.length }}</span>
               </div>
               <p class="text-sm text-gray-500">You are about to process these participants. Are you sure you want to continue?</p>
            </div>
            <div class="flex justify-end gap-3 pt-4">
                <Button variant="outline" @click="showConfirmModal = false" :disabled="isSubmitting">Cancel</Button>
                <Button id="confirm-btn" @click="submitBatch" :disabled="isSubmitting">
                    <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin"/>
                    Confirm & Process
                </Button>
            </div>
        </div>
    </div>

  </div>
</template>

<style scoped>
/* Add any specific styles if needed */
</style>