<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRegistrationStore } from '../store/RegistrationStore'
import MyBooking from '../components/MyBooking.vue'
import MyStaffing from '../components/MyStaffing.vue'

const router = useRouter()
const registerStore = useRegistrationStore()
const myBookRegis = computed(() => registerStore.myRegistrations ?? [])
const myStaffRegis = computed(() => registerStore.myStaffStatus ?? [])
const returnToHomePage = () => {
  router.push('/event/Listing')
}

type regisType = 'Book' | 'Staff'

const regisTab = ref<regisType>('Book')

const changeRegisTab = (tab: regisType) => {
  if (regisTab.value === tab) return
  regisTab.value = tab
  // if (regisTab.value === 'Book') {
  //   registerStore.fetchMyRegistrations()
  // } else {
  //   registerStore.fetchMyStaffStatus()
  // }
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
        <div v-if="regisTab === 'Book'">
          <MyBooking :my-regis="myBookRegis" />
        </div>
        <div v-if="regisTab === 'Staff'">
          <MyStaffing :my-regis="myStaffRegis" />
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
