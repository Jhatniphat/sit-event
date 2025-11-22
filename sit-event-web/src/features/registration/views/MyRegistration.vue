<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
}

onMounted(() => {
  registerStore.fetchMyRegistrations()
  registerStore.fetchMyStaffStatus()
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
          <div class="flex flex-row text-lg relative">
            <div
              class="mx-3 cursor-pointer"
              :class="{ 'font-bold': regisTab === 'Book' }"
              @click="changeRegisTab('Book')"
            >
              My Booking
            </div>

            <div
              class="mx-3 cursor-pointer"
              :class="{ 'font-bold': regisTab === 'Staff' }"
              @click="changeRegisTab('Staff')"
            >
              My Staffing
            </div>

            <!-- underline (เส้นเลื่อน) -->
            <div
              class="underline-bar"
              :style="{
                transform: regisTab === 'Book' ? 'translateX(0)' : 'translateX(120px)',
              }"
            ></div>
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
.underline-bar {
  position: absolute;
  margin-top: 10px;
  bottom: -4px; /* ระยะห่างลงล่าง */
  left: 0;
  width: 125px; /* ความกว้างของเส้น */
  height: 3px;
  background-color: black;
  border-radius: 999px;
  transition: transform 0.25s ease;
  transform: translateX(0);
}
</style>
