<template>
  <div>
    <div class="flex flex-col justify-between h-screen">
      <div class="flex flex-row justify-between p-4 mb-2 items-center">
        <div>
          <img
            @click="returnToHomePage"
            src="../../../assets/icons/back_arrow.svg"
            alt="backToHome"
          />
        </div>
        <div class="text-lg font-bold">Event Details</div>
        <div class="w-4"></div>
      </div>
      <div class="h-52 flex justify-center">
        <img class="w-full" src="../../../assets/images/mock_profile.png" />
      </div>
      <div class="flex flex-col justify-between h-full">
        <div class="h-full p-4">
          <div class="font-bold text-4xl mb-2">{{ event?.id }}</div>
          <div class="text-2xl font-semibold mb-2">{{ event?.name }}</div>
          <div class="mb-4">
            <div class="mb-2">{{ event?.description }}</div>
            <div class="text-slate"></div>
          </div>
        </div>
      </div>
      <div>
        <div class="m-4 flex flex-row gap-2">
          <div class="flex-2">
            <button
              @click="goToBooking()"
              class="w-full bg-blue-500 hover:bg-blue-600 rounded-sm p-3 text-white"
            >
              Book Now
            </button>
          </div>
          <div>
            <button
              @click="goToApplyStaff()"
              class="w-full hover:bg-slate-100 rounded-sm p-3 text-black border border-slate-300"
            >
              Apply as Staff
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventStore } from '../store/EventStore'
const eventStore = useEventStore()

const route = useRoute()
const router = useRouter()
const event = computed(() => eventStore.currentEvent)

onMounted(async () => {
  const id = Number(route.params.id)
  // fetch ข้อมูลจาก backend
  await eventStore.fetchEventById(id.toString())
})

const returnToHomePage = () => {
  router.push('/event/Listing')
}

const goToBooking = () => {
  router.push(`/event/${event.value?.id}/register`)
}

const goToApplyStaff = () => {
  router.push(`/event/${event.value?.id}/register/staff`)
}
</script>
