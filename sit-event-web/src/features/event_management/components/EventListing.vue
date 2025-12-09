<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Pagination from '@/components/ui/commons/pagination.vue'
import { useEventStore } from '../store/EventStore'
const currentPage = ref(1)
const currentLimit = ref(8)
const eventStore = useEventStore()

const events = computed(() => eventStore.events)
const paginations = computed(() => eventStore.pagination)

onMounted(() => {
  eventStore.fetchAllEvents(currentPage.value, currentLimit.value)
})

const handlePageChange = async (page: number) => {
  await eventStore.fetchAllEvents(page, currentLimit.value)
  currentPage.value = page
}

const handleLimitChange = async (newLimit: number) => {
  currentLimit.value = newLimit
  currentPage.value = 1
  await eventStore.fetchAllEvents(1, newLimit)
}

// id: string;
// name: string;
// description: string;
// thumbnail: string;
// registrationOpenDate: Date;
// registrationEndDate: Date;
// eventStartDate: Date;
// eventEndDate: Date;
// targetAudience: TargetAudience[];
// tags: EventTag[];
// creatorId: Date;
// createdAt: Date;

// const mockEventData = [
//   {
//     eventName: 'Campus Fest',
//     date: '2024-09-15',
//     location: 'Main Quad',
//     status: 'Active',
//   },
//   {
//     eventName: 'Career Fair',
//     date: '2024-10-20',
//     location: 'Student Union',
//     status: 'Upcoming',
//   },
//   {
//     eventName: 'Alumni Reunion',
//     date: '2024-11-05',
//     location: 'Alumni Hall',
//     status: 'Completed',
//   },
//   {
//     eventName: 'Research Symposium',
//     date: '2024-12-10',
//     location: 'Science Building',
//     status: 'Active',
//   },
//   {
//     eventName: 'Holiday Gala',
//     date: '2025-01-15',
//     location: 'Grand Ballroom',
//     status: 'Upcoming',
//   },
// ]

const formatDate = (dateStr: string | number | Date) => {
  return new Date(dateStr).toLocaleDateString('en-CA') // หรือ 'th-TH'
}
</script>

<template>
<div></div>
<!-- <div class="container">
    <div class="font-bold text-4xl">My Events</div>
    <div class="h-8"></div>
    <div class="container rounded-xl border border-slate-200">
      <table class="w-full py-3">
        <thead>
          <tr class="font-semibold">
            <th class="text-start py-3 px-5">Event Name</th>
            <th class="text-start py-3 px-5">Date</th>
            <th class="text-start py-3 px-5">Location</th>
            <th class="text-start py-3 px-5">Status</th>
            <th class="text-start py-3 px-5">Action</th>
          </tr>
        </thead>
        <tbody v-if="events && events.length">
          <tr
            v-for="(event, index) in events"
            :key="index"
            class="border border-slate-200 border-y-1 border-x-0 rounded-xl"
          >
            <td class="p-4 py-5">{{ event.name }}</td>
            <td class="p-4 py-5 text-slate-400">
              {{ formatDate(event.eventStartDate) }}
            </td>
            <td class="p-4 py-5 text-slate-400">{{ event.location }}</td>
            <td class="p-4 py-5">
              <div class="bg-slate-100 text-black p-1 rounded-lg font-semibold text-center">
                {{ event.status }}
              </div>
            </td>
            <td class="p-4 py-5 text-center">
              <button @click="console.log(event)" class="text-slate-600 font-semibold">
                View Detail
              </button>
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td
              colspan="5"
              class="border border-slate-200 border-y-1 border-x-0 rounded-xl text-center py-10 text-slate-400 italic"
            >
              No events found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="h-4"></div>
    <div class="flex flex-row justify-end">
      <div>
        <Pagination
          v-model="currentPage"
          :count="paginations?.totalPages"
          responsive
          @page-change="handlePageChange"
          @limit-change="handleLimitChange"
        />
      </div>
    </div>
  </div> -->
</template>

<style scoped>
.container {
  /* styles */
}
</style>
