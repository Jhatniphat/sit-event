<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRegistrationStore } from '../store/RegistrationStore'
import BaseButton from '@/components/ui/button/BaseButton.vue'

const router = useRouter()
const registerStore = useRegistrationStore()
const myRegis = registerStore.myRegistrations

const returnToHomePage = () => {
  router.push('/event/Listing')
}

const mockMyRegis = [
  {
    Image: '../../../assets/images/mock_sub_session1.png',
    name: 'Test Test',
    Date: '2024-10-26T10:00:00',
  },
  {
    Image: '../../../assets/images/mock_sub_session1.png',
    name: 'Test Test',
    Date: '2024-10-26T10:00:00',
  },
  {
    Image: '../../../assets/images/mock_sub_session1.png',
    name: 'Test Test',
    Date: '2024-10-26T10:00:00',
  },
]

function formatEventDate(dateString: string): string {
  const date = new Date(dateString)

  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date)

  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)

  return `${datePart} - ${timePart}`
}

onMounted(() => {
  registerStore.fetchMyRegistrations()
})
</script>

<template>
  <div>
    <div>
      <div class="p-4">
        <div class="flex flex-row justify-between items-center">
          <div>
            <img
              @click="returnToHomePage"
              src="../../../assets//icons/back_arrow.svg"
              alt="backToHome"
            />
          </div>
          <div class="font-bold text-lg">My Bookings</div>
          <div class="w-4"></div>
        </div>
        <div class="mt-8">
          <div class="font-semibold text-xl">Upcoming</div>
          <div class="h-2"></div>
          <div v-for="(event, index) in mockMyRegis" :key="index">
            <div class="flex flex-row justify-start items-center my-3">
              <div class="flex flex-row items-center flex-1">
                <div>
                  <img
                    src="../../../assets/images/mock_sub_session2.png"
                    alt="Event Image"
                    class="w-12 h-12 rounded-sm"
                  />
                </div>
                <div class="w-5"></div>
                <div class="flex flex-col justify-center">
                  <div class="">{{ event.name }}</div>
                  <div class="text-sm text-slate-400">{{ formatEventDate(event.Date) }}</div>
                </div>
              </div>
              <div>
                <button class="text-sm bg-slate-100 hover:bg-slate-200 px-5 py-1 rounded-md">
                  View
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-8">
          <div class="font-semibold text-xl">Ongoing</div>
          <div class="h-2"></div>
          <div v-for="(event, index) in mockMyRegis" :key="index">
            <div class="flex flex-row justify-start items-center my-3">
              <div class="flex flex-row items-center flex-1">
                <div>
                  <img
                    src="../../../assets/images/mock_sub_session2.png"
                    alt="Event Image"
                    class="w-12 h-12 rounded-sm"
                  />
                </div>
                <div class="w-5"></div>
                <div class="flex flex-col justify-center">
                  <div class="">{{ event.name }}</div>
                  <div class="text-sm text-slate-400">{{ formatEventDate(event.Date) }}</div>
                </div>
              </div>
              <div>
                <button class="text-sm bg-slate-100 hover:bg-slate-200 px-5 py-1 rounded-md">
                  View
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  /* styles */
}
</style>
