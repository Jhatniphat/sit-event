<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import TagInput from '@/components/ui/commons/TagInput.vue'
import { XCircle } from 'lucide-vue-next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { EventSession } from '@/features/event_management/services/EventServices';
import type { StaffScope } from '../services/StaffService';

const props = defineProps<{
  allRole: string[]
  allSession: EventSession[]
  allScopes: StaffScope[] // เพิ่มเพื่อเอามาเช็คสิทธิ์ที่มีอยู่แล้ว
  selectedStaffIds: string[] // เพิ่มเพื่อรู้ว่ากำลังจัดการให้ใคร
  selectedStaffNames: string[]
  selectedRoles?: string[]
  selectedSession?: string
}>()

const emit = defineEmits(['update:selectedRoles', 'update:selectedSession'])

const internalRoles = ref<string[]>(props.selectedRoles || [])
const internalSession = ref<string>(props.selectedSession || '')

const clearSession = () => {
  internalSession.value = ''
}

watch(internalRoles, (newVal) => emit('update:selectedRoles', newVal))
watch(internalSession, (newVal) => emit('update:selectedSession', newVal))

// --- Logic การกรอง Session ---
const availableSessions = computed(() => {
  // ถ้ายังไม่ได้เลือก Staff หรือเลือกหลายคน อาจจะยากในการกรอง แนะนำให้ใช้คนแรกเป็นเกณฑ์หรือโชว์ทั้งหมด
  if (props.selectedStaffIds.length === 0) return props.allSession

  // หา sessionId ทั้งหมดที่พนักงานกลุ่มนี้ (คนแรก) มีอยู่แล้ว
  const firstStaffId = props.selectedStaffIds[0]
  const alreadyHasSessionIds = props.allScopes
    .filter(s => s.staffId === firstStaffId)
    .map(s => s.sessionId || null) // null คือ Event-Wide

  // กรอง session ที่ยังไม่มีใน list สิทธิ์เดิมของเขา
  return props.allSession.filter(session => !alreadyHasSessionIds.includes(session.id))
})

// เช็คว่าเขามีสิทธิ์ Event-Wide (null) ไปหรือยัง
const hasEventWidePermission = computed(() => {
  if (props.selectedStaffIds.length === 0) return false
  const firstStaffId = props.selectedStaffIds[0]
  return props.allScopes.some(s => s.staffId === firstStaffId && s.sessionId === null)
})

const displayStaffText = (names: string[]) => {
  if (names.length === 0) return 'No staff selected'
  const limit = 3
  if (names.length > limit) {
    return `${names.slice(0, limit).join(', ')} ... and +${names.length - limit} more`
  }
  return names.join(', ')
}

// หาชื่อ Session เพื่อเอามาโชว์ในข้อความด้านล่าง
const getSelectedSessionName = computed(() => {
  const found = props.allSession.find(s => s.id === internalSession.value)
  return found ? found.name : ''
})
</script>

<template>
  <div class="flex flex-col w-full space-y-6 text-left">
    <div class="flex flex-col gap-2">
      <div class="text-gray-500 text-sm font-medium italic">Grant role and session to staff:</div>
      <div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300">
        <span class="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold uppercase tracking-wider">
          Target
        </span>
        <span class="text-gray-900 text-sm font-semibold truncate">
          {{ displayStaffText(selectedStaffNames) }}
        </span>
      </div>
    </div>

    <div class="w-full border-2 p-6 border-gray-100 rounded-2xl bg-white shadow-sm flex flex-row items-start gap-8">
      <div class="flex flex-col w-1/2 gap-3">
        <div class="flex flex-row gap-1 items-center h-[20px]">
          <label class="text-gray-800 text-sm font-bold">Assign Roles</label>
          <span class="text-red-500 font-bold">*</span>
        </div>
        <TagInput
          placeholder="Select roles..."
          :choices="allRole"
          v-model="internalRoles"
          id="input-staff-role"
        />
        <p class="text-[11px] text-gray-400 italic">Admin can select multiple roles.</p>
      </div>

      <div class="flex flex-col w-1/2 gap-3">
        <div class="flex flex-row justify-between items-center h-[20px]">
          <label class="text-gray-800 text-sm font-bold">Assign Session</label>
          <button 
            v-if="internalSession" 
            @click="clearSession" 
            class="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors"
          >
            <XCircle class="w-3 h-3" />
            CLEAR TO EVENT-WIDE
          </button>
        </div>

        <Select v-model="internalSession">
          <SelectTrigger class="w-full h-[42px] border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-black">
            <SelectValue placeholder="Pick a session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="session in availableSessions" :key="session.id" :value="session.id">
              {{ session.name }}
            </SelectItem>
            <div v-if="availableSessions.length === 0" class="p-4 text-center text-xs text-gray-400">
              No more sessions available for this staff.
            </div>
          </SelectContent>
        </Select>

        <div class="text-[11px] leading-relaxed">
          <div v-if="!internalSession">
            <p v-if="hasEventWidePermission" class="text-red-500 font-bold">
              * This staff already has Event-wide permissions. Please pick a specific session.
            </p>
            <p v-else class="text-blue-600 font-semibold">
              * No session selected: Roles will apply to the entire event.
            </p>
          </div>
          <p v-else class="text-gray-400 italic">
            Roles will only apply to the "{{ getSelectedSessionName }}" session.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>