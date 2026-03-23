<script setup lang="ts">
import { CheckCircle2, Users, ShieldCheck, CalendarRange } from 'lucide-vue-next'

const props = defineProps<{
  selectedStaffNames: string[]
  selectedRoles: string[]
  selectedSession: string
}>()

const formatEnum = (value: string) => {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
</script>

<template>
  <div class="flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-300">
    <div class="text-center space-y-2 py-4">
      <div class="flex justify-center">
        <div class="bg-green-100 p-3 rounded-full">
          <CheckCircle2 class="w-10 h-10 text-green-600" />
        </div>
      </div>
      <h2 class="text-xl font-bold text-gray-900">Review Permissions</h2>
      <p class="text-sm text-gray-500">Please double-check the details below before confirming.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm space-y-3">
        <div
          class="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider"
        >
          <Users class="w-4 h-4" />
          Target Staff ({{ selectedStaffNames.length }})
        </div>
        <div class="max-h-[120px] overflow-y-auto pr-2 space-y-1 scrollbar-hide">
          <div
            v-for="name in selectedStaffNames"
            :key="name"
            class="text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100"
          >
            {{ name }}
          </div>
        </div>
      </div>

      <div class="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm space-y-4">
        <div class="space-y-3">
          <div
            class="flex items-center gap-2 text-purple-600 font-bold text-sm uppercase tracking-wider"
          >
            <ShieldCheck class="w-4 h-4" />
            Assigned Roles
          </div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="role in selectedRoles"
              :key="role"
              class="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded text-xs font-semibold"
            >
              {{ formatEnum(role) }}
            </span>
          </div>
        </div>

        <div class="pt-2 border-t border-gray-50">
          <div
            class="flex items-center gap-2 text-orange-600 font-bold text-sm uppercase tracking-wider mb-2"
          >
            <CalendarRange class="w-4 h-4" />
            Session
          </div>
          <p class="text-sm font-medium text-gray-900 px-1">
            {{ selectedSession || 'Not selected' }}
          </p>
        </div>
      </div>
    </div>

    <div class="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
      <span class="text-amber-600 font-bold">⚠️</span>
      <p class="text-xs text-amber-800 leading-relaxed">
        This action will update access for all
        <strong>{{ selectedStaffNames.length }}</strong> selected members.
      </p>
    </div>
  </div>
</template>
