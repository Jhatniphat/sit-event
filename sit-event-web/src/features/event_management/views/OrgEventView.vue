<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '@/features/event_management/store/EventStore'
import { FileUser } from 'lucide-vue-next'
import BaseButton from '@/components/ui/button/BaseButton.vue'
import { toast } from 'vue-sonner'

const router = useRouter()
const eventStore = useEventStore()

// --- State ---
const showDeleteModal = ref(false)
const eventToDeleteId = ref<string | null>(null)

// --- Computed ---
const events = computed(() => eventStore.events)
const isLoading = computed(() => eventStore.isLoadingList)

// --- Hooks ---
onMounted(() => {
  eventStore.fetchAllEvents(1, 100)
})

// --- Actions ---
const handleCreate = () => {
  router.push({ name: 'CreateEvent' })
}

const handleFormsList = (id: string) => {
  router.push({ name: 'FormsList', params: { id } })
}

const handleView = (id: string) => {
  router.push({ name: 'EventDetail', params: { id } })
}

const handleEdit = (id: string) => {
  router.push({ name: 'EditEvent', params: { id } })
}

const confirmDelete = (id: string) => {
  eventToDeleteId.value = id
  showDeleteModal.value = true
}

const executeDelete = async () => {
  if (!eventToDeleteId.value) return

  const deletePromise = eventStore.deleteEvent(eventToDeleteId.value)

  toast.promise(deletePromise, {
    loading: 'Deleting event...',
    success: () => {
      showDeleteModal.value = false
      eventToDeleteId.value = null
      return 'Event deleted successfully'
    },
    error: (err: any) => {
      return err?.response?.data?.message || err?.message || 'Failed to delete event'
    },
  })
}

const cancelDelete = () => {
  showDeleteModal.value = false
  eventToDeleteId.value = null
}

// --- Helpers ---
const formatDateRange = (start: string | Date, end: string | Date) => {
  const s = new Date(start)
  const e = new Date(end)
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  return `${s.toLocaleDateString('en-US', options)} - ${e.toLocaleDateString('en-US', options)}`
}

const getEventStatus = (start: string | Date, end: string | Date) => {
  const now = new Date().getTime()
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  if (now < startTime) {
    return { label: 'Upcoming', class: 'bg-blue-100 text-blue-700 border-blue-200' }
  } else if (now >= startTime && now <= endTime) {
    return { label: 'Ongoing', class: 'bg-green-100 text-green-700 border-green-200' }
  } else {
    return { label: 'Ended', class: 'bg-gray-100 text-gray-700 border-gray-200' }
  }
}

// Helper function to format Enums (e.g. INTERNAL_STUDENT -> Internal Student)
const formatEnum = (value: string) => {
  if (!value) return '-'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-8">
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Event Management</h1>
          <p class="text-muted-foreground text-gray-500 mt-1">
            Manage your events, track status, and organize schedules.
          </p>
        </div>
        <div class="flex flex-row gap-2">
          <BaseButton
            @click="handleCreate"
            label="+ New Event"
            class="bg-black text-white px-4 py-2"
          />
        </div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
              <tr>
                <th class="px-6 py-4 w-[250px]">Event Name</th>
                <th class="px-6 py-4 w-[220px]">Date & Time</th>
                <th class="px-6 py-4">Target Audience</th>
                <th class="px-6 py-4">Tags</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-if="isLoading" class="animate-pulse">
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">Loading events...</td>
              </tr>
              <tr v-else-if="events.length === 0">
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                  No events found. Create one to get started.
                </td>
              </tr>

              <tr
                v-for="event in events"
                :key="event.id"
                class="hover:bg-gray-50/80 transition-colors"
              >
                <td class="px-6 py-4 font-medium text-gray-900">
                  <div class="truncate max-w-[200px]" :title="event.name">
                    {{ event.name }}
                  </div>
                </td>

                <td class="px-6 py-4 text-gray-600">
                  <div class="flex flex-col">
                    <span>{{
                      formatDateRange(event.eventStartDate, event.eventEndDate).split(' - ')[0]
                    }}</span>
                    <span class="text-xs text-gray-400"
                      >to
                      {{
                        formatDateRange(event.eventStartDate, event.eventEndDate).split(' - ')[1]
                      }}</span
                    >
                  </div>
                </td>

                <td class="px-6 py-4 text-gray-600">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="aud in event.targetAudience"
                      :key="aud"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100"
                    >
                      {{ formatEnum(aud) }}
                    </span>
                    <span v-if="!event.targetAudience?.length" class="text-gray-400">-</span>
                  </div>
                </td>

                <td class="px-6 py-4 text-gray-600">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="tag in event.tags"
                      :key="tag"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100"
                    >
                      {{ formatEnum(tag) }}
                    </span>
                    <span v-if="!event.tags?.length" class="text-gray-400">-</span>
                  </div>
                </td>

                <td class="px-6 py-4">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                    :class="getEventStatus(event.eventStartDate, event.eventEndDate).class"
                  >
                    {{ getEventStatus(event.eventStartDate, event.eventEndDate).label }}
                  </span>
                </td>

                <td class="px-6 py-4 text-right space-x-2">
                  <button
                    @click="handleView(event.id)"
                    class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="View Details"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>

                  <button
                    @click="handleEdit(event.id)"
                    class="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                    title="Edit Event"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                  <button
                    @click="handleFormsList(event.id)"
                    class="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                    title="Form Responses"
                  >
                    <FileUser class="h-4 w-4" />
                  </button>

                  <button
                    @click="confirmDelete(event.id)"
                    class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete Event"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
        <p class="text-gray-500">
          Are you sure you want to delete this event? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-3 pt-2">
          <button
            @click="cancelDelete"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="executeDelete"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
