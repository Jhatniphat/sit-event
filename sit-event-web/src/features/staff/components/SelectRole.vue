<script setup lang="ts">
import { ref, watch } from 'vue'
import TagInput from '@/components/ui/commons/TagInput.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = defineProps<{
  allRole: string[]
  allSession: string[]
  selectedStaffNames: string[]
  // เพิ่มการรับค่า v-model ถ้าต้องการส่งกลับไปไฟล์หลัก
  selectedRoles?: string[]
  selectedSession?: string
}>()

const emit = defineEmits(['update:selectedRoles', 'update:selectedSession'])

// สร้าง Local State สำหรับเก็บค่าที่เลือก
const internalRoles = ref<string[]>(props.selectedRoles || [])
const internalSession = ref<string>(props.selectedSession || '')

// คอยส่งค่ากลับเมื่อมีการเปลี่ยนแปลง
watch(internalRoles, (newVal) => emit('update:selectedRoles', newVal))
watch(internalSession, (newVal) => emit('update:selectedSession', newVal))

const displayStaffText = (names: string[]) => {
  if (names.length === 0) return 'No staff selected'
  const limit = 3
  if (names.length > limit) {
    return `${names.slice(0, limit).join(', ')} ... and +${names.length - limit} more`
  }
  return names.join(', ')
}
</script>

<template>
  <div class="flex flex-col w-full space-y-6">
    <div class="flex flex-col gap-2">
      <div class="text-gray-500 text-sm font-medium italic">Grant role and session to staff:</div>
      <div
        class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300"
      >
        <span
          class="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold uppercase tracking-wider"
        >
          Target
        </span>
        <span class="text-gray-900 text-sm font-semibold truncate">
          {{ displayStaffText(selectedStaffNames) }}
        </span>
      </div>
    </div>

    <div
      class="w-full border-2 p-6 border-gray-100 rounded-2xl bg-white shadow-sm flex flex-row items-start gap-8"
    >
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
        <div class="flex flex-row gap-1 items-center h-[20px]">
          <label class="text-gray-800 text-sm font-bold">Assign Session</label>
          <span class="text-red-500 font-bold">*</span>
        </div>
        <Select v-model="internalSession">
          <SelectTrigger
            class="w-full h-[42px] border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-black"
          >
            <SelectValue placeholder="Pick a session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="session in allSession" :key="session" :value="session">
              {{ session }}
            </SelectItem>
          </SelectContent>
        </Select>
        <p class="text-[11px] text-gray-400 italic">Each batch update requires one session.</p>
      </div>
    </div>
  </div>
</template>
