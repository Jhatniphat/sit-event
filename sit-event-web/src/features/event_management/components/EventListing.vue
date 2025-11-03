<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/ui/button/BaseButton.vue'
import Modal from '@/components/ui/commons/ModalBox.vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const modalOpen = ref(false)
const ChangeEventView = (page: string) => {
  router.push(`/event/${page}`)
}
const modalDeleteOpen = () => {
  modalOpen.value = true
}

const mockEventData = [
  {
    eventName: 'Campus Fest',
    date: '2024-09-15',
    location: 'Main Quad',
    status: 'Active',
  },
  {
    eventName: 'Career Fair',
    date: '2024-10-20',
    location: 'Student Union',
    status: 'Upcoming',
  },
  {
    eventName: 'Alumni Reunion',
    date: '2024-11-05',
    location: 'Alumni Hall',
    status: 'Completed',
  },
  {
    eventName: 'Research Symposium',
    date: '2024-12-10',
    location: 'Science Building',
    status: 'Active',
  },
  {
    eventName: 'Holiday Gala',
    date: '2025-01-15',
    location: 'Grand Ballroom',
    status: 'Upcoming',
  },
]
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
        <tbody>
          <tr
            v-for="(event, index) in mockEventData"
            :key="index"
            class="border border-slate-200 border-y-1 border-x-0 rounded-xl"
          >
            <td class="p-4 py-5">{{ event.eventName }}</td>
            <td class="p-4 py-5 text-slate-400">{{ event.date }}</td>
            <td class="p-4 py-5 text-slate-400">{{ event.location }}</td>
            <td class="p-4 py-5">
              <div class="bg-slate-100 text-black p-1 rounded-lg font-semibold text-center">
                {{ event.status }}
              </div>
            </td>
            <td class="pp-4 py-5 text-center">
              <button @click="ChangeEventView('view')" class="text-slate-600 font-semibold">
                View Detail
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.container {
  /* styles */
}
</style>
