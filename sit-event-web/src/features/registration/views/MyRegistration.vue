<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRegistrationStore } from '../store/RegistrationStore'

const router = useRouter()
const registerStore = useRegistrationStore()
const myRegis = computed(() => registerStore.myRegistrations)

const returnToHomePage = () => {
  router.push('/event/Listing')
}

// const mockMyRegis = [
//   {
//     Image: '../../../assets/images/mock_sub_session1.png',
//     name: 'Test Test',
//     date: '2024-10-26T10:00:00',
//   },
//   {
//     Image: '../../../assets/images/mock_sub_session1.png',
//     name: 'Test Test',
//     date: '2025-12-26T10:00:00',
//   },
//   {
//     Image: '../../../assets/images/mock_sub_session1.png',
//     name: 'Test Test',
//     date: '2024-10-26T10:00:00',
//   },
// ]
const now = new Date()

const upcoming = computed(() => myRegis.value.filter((r) => new Date(r.event.eventStartDate) > now))

const ongoing = computed(() => myRegis.value.filter((r) => new Date(r.event.eventStartDate) <= now))

function formatEventDate(dateString: string | Date): string {
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

type regisType = 'Book' | 'Staff'

const regisTab = ref<regisType>('Book')

const changeRegisTab = (tab: regisType) => {
  if (regisTab.value === tab) return
  regisTab.value = tab
  if (regisTab.value === 'Book') {
    registerStore.fetchMyRegistrations()
  } else {
    registerStore.fetchMyStaffStatus()
  }
}
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
          <div class="flex flex-row text-lg">
            <div class="flex flex-col">
              <div
                class="mx-3"
                :class="{ 'font-bold': regisTab === 'Book' }"
                @click="changeRegisTab('Book')"
              >
                My Booking
              </div>
              <div :class="{ 'mt-1 h-1 rounded-xl bg-black': regisTab === 'Book' }"></div>
            </div>
            <div class="flex flex-col">
              <div
                class="mx-3"
                :class="{ 'font-bold': regisTab == 'Staff' }"
                @click="changeRegisTab('Staff')"
              >
                My Staffing
              </div>
              <div :class="{ 'mt-1 h-1 rounded-xl bg-black': regisTab === 'Staff' }"></div>
            </div>
          </div>
          <div class="w-4"></div>
        </div>
        <div class="mt-8">
          <div class="font-semibold text-xl">Upcoming</div>
          <div class="h-2"></div>
          <div v-for="(reg, index) in upcoming" :key="index">
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
                  <div class="">{{ reg.event.name }}</div>
                  <div class="text-sm text-slate-400">
                    {{ formatEventDate(reg.event.eventStartDate) }}
                  </div>
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
          <div v-for="(reg, index) in ongoing" :key="index">
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
                  <div class="">{{ reg.event.name }}</div>
                  <div class="text-sm text-slate-400">
                    {{ formatEventDate(reg.event.eventStartDate) }}
                  </div>
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
