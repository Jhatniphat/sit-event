<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '@/components/ui/button/BaseButton.vue'
import Modal from '@/components/ui/commons/ModalBox.vue'
import Pagination from '@/components/ui/commons/pagination.vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '../store/EventStore'
const router = useRouter()
const modalOpen = ref(false)
const currentPage = ref(1)
const eventStore = useEventStore()

const events = computed(() => eventStore.events)

const handlePageChange = (page: number) => {
  currentPage.value = page
}

const ChangeEventView = (page: string) => {
  router.push(`/event/${page}`)
}
const modalDeleteOpen = () => {
  modalOpen.value = true
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
  <div class="container">
    <div class="font-bold text-4xl">My Events</div>
    <div class="h-4"></div>
    <div class="flex flex-row py-2">
      <div class="container"></div>
      <div class="container">
        <div class="container flex flex-row justify-between">
          <div class="mx-2">
            <BaseButton @click="ChangeEventView('update')" label="Update" color="grey" />
          </div>
          <div class="mx-2">
            <BaseButton @click="modalDeleteOpen" label="Delete" color="red" />
            <Modal v-model="modalOpen">
              <h2 class="text-xl font-bold mb-4">Delete Modal</h2>
              <p>Test Modal</p>
              <div class="flex justify-end">
                <BaseButton @click="modalOpen = false" color="red" label="Close" />
              </div>
            </Modal>
          </div>
        </div>
      </div>
      <div class="container"></div>
    </div>
    <div class="h-4"></div>
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
            <!-- ChangeEventView('view') -->
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
        <Pagination v-model="currentPage" :count="4" @page-change="handlePageChange" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  /* styles */
}
</style>
