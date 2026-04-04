<script setup lang="ts">
import type { StaffMember } from '../services/StaffService'

const props = defineProps<{
  allStaff: StaffMember[]
  selectedIds: string[]
}>()

const emit = defineEmits(['update:selectedIds'])

const toggleStaff = (id: string) => {
  const newIds = [...props.selectedIds]
  const index = newIds.indexOf(id)

  if (index > -1) {
    newIds.splice(index, 1)
  } else {
    newIds.push(id)
  }
  emit('update:selectedIds', newIds)
}

const isSelected = (id: string) => props.selectedIds.includes(id)

const toggleAll = () => {
  if (props.selectedIds.length === props.allStaff.length) {
    emit('update:selectedIds', [])
  } else {
    emit(
      'update:selectedIds',
      props.allStaff.map((s) => s.id),
    )
  }
}
</script>

<template>
  <div class="flex flex-col w-full max-h-[500px] space-y-4">
    <div class="flex flex-row justify-between items-center w-full px-1 shrink-0">
      <div class="text-gray-500 text-sm font-medium italic">Select staff to grant access:</div>
      <div class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-bold">
        {{ selectedIds.length }} / {{ allStaff.length }} Selected
      </div>
    </div>

    <div
      class="w-full flex-1 border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden flex flex-col"
    >
      <div class="overflow-y-auto h-full scrollbar-hide">
        <table class="w-full text-sm text-left border-collapse">
          <thead
            class="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold sticky top-0 z-20"
          >
            <tr>
              <th class="px-6 py-4 sticky left-0 bg-gray-50 z-30 border-r w-[60px] text-center">
                <input
                  type="checkbox"
                  :checked="selectedIds.length === allStaff.length && allStaff.length > 0"
                  @change="toggleAll"
                  class="w-4 h-4 accent-black cursor-pointer"
                />
              </th>
              <th class="px-6 py-4 bg-gray-50 border-r min-w-[200px]">Name</th>
              <th class="px-6 py-4 bg-gray-50 min-w-[250px]">Email</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100">
            <tr v-if="allStaff.length === 0">
              <td colspan="3" class="px-6 py-12 text-center text-gray-500 italic">
                <div class="flex flex-col items-center justify-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-8 w-8 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <span>No staff members found.</span>
                </div>
              </td>
            </tr>
            <tr
              v-else
              v-for="staff in allStaff"
              :key="staff.id"
              @click="toggleStaff(staff.id)"
              class="group transition-colors cursor-pointer"
              :class="isSelected(staff.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'"
            >
              <td
                class="px-6 py-4 sticky left-0 z-10 border-r text-center transition-colors"
                :class="isSelected(staff.id) ? 'bg-blue-50/50' : 'bg-white group-hover:bg-gray-50'"
              >
                <input
                  type="checkbox"
                  :checked="isSelected(staff.id)"
                  @click.stop="toggleStaff(staff.id)"
                  class="w-4 h-4 accent-black cursor-pointer rounded border-gray-300"
                />
              </td>
              <td
                class="px-6 py-4 font-medium border-r"
                :class="isSelected(staff.id) ? 'text-blue-700' : 'text-gray-900'"
              >
                {{ staff.user.firstName }} {{ staff.user.lastName }}
              </td>
              <td class="px-6 py-4 text-gray-600">
                {{ staff.user.email }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
