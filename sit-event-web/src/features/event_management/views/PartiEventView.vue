<script setup lang="ts">
import NavBar from '@/components/ui/commons/NavBar.vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import 'swiper/css'
import 'swiper/css/pagination'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Pagination, Autoplay } from 'swiper/modules'
import paginationComponent from '@/components/ui/commons/pagination.vue'
import { useEventStore } from '../store/EventStore'
import authService from '@/features/auth/services/auth.service'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const AppLang = ref('EN')
const isOpenMenu = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const menuButton = ref<HTMLElement | null>(null)
const eventStore = useEventStore()
const events = computed(() => eventStore.events)
const paginations = computed(() => eventStore.pagination)
const currentPage = ref(1)
const currentLimit = ref(5)
const router = useRouter()
const authStore = useAuthStore()

const ChangeLng = () => {
  if (AppLang.value === 'EN') {
    AppLang.value = 'TH'
  } else {
    AppLang.value = 'EN'
  }
}

const toggleMenu = () => {
  isOpenMenu.value = !isOpenMenu.value
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node

  if (
    isOpenMenu.value &&
    menuRef.value &&
    menuButton.value &&
    !menuRef.value.contains(target) &&
    !menuButton.value.contains(target)
  ) {
    isOpenMenu.value = false
  }
}

const handlePageChange = async (page: number) => {
  await eventStore.fetchAllEvents(page, currentLimit.value)
  currentPage.value = page
}

const handleLimitChange = async (newLimit: number) => {
  currentLimit.value = newLimit
  currentPage.value = 1
  await eventStore.fetchAllEvents(1, newLimit)
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

onMounted(() => {
  eventStore.fetchAllEvents(currentPage.value, currentLimit.value)
})

const slides = [
  {
    title: 'Welcome to "SIT Event"',
    desc: 'Under the concept "Synergistic Intelligence Transformation", this event celebrates the 30th anniversary of SIT. It will be a great opportunity to broaden perspectives in information technology and to learn about new technologies and innovations that will help enhance students potential in the digital era.',
    image: new URL('../../../assets/images/mock_eventLanding.png', import.meta.url).href,
    button: 'International AI Hackathon 2025',
  },
  {
    title: 'Next Generation Tech',
    desc: 'Explore new innovations and digital transformation.',
    image: new URL('../../../assets/images/mock_eventLanding.png', import.meta.url).href,
    button: 'Join Now',
  },
  {
    title: 'Empowering Students',
    desc: 'Enhance students’ potential in the digital era.',
    image: new URL('../../../assets/images/mock_eventLanding.png', import.meta.url).href,
    button: 'Learn More',
  },
]

// const eventsMock = ref([
//   {
//     image: new URL('../../../assets/images/mock_sub_session1.png', import.meta.url).href,
//     name: 'Loy Krathong Festival 2025',
//     eventStartDate: '2025-10-10',
//     description:
//       'ksfsjkdfkshdkfjhskjdfhsjkhfkshdfkjhskjdfhjksdhfkjshdjkfhsjkdfhkjsdfjkhssdfsdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfs',
//   },
//   {
//     image: new URL('../../../assets/images/mock_sub_session2.png', import.meta.url).href,
//     name: 'Sit Sport Day 2025',
//     eventStartDate: '2025-10-10',
//     description:
//       'ksfsjkdfkshdkfjhskjdfhsjkhfkshdfkjhskjdfhjksdhfkjshdjkfhsjkdfhkjsdfjkhssdfsdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfs',
//   },
//   {
//     image: new URL('../../../assets/images/mock_sub_session1.png', import.meta.url).href,
//     name: 'Sit Open House 2025',
//     eventStartDate: '2025-10-10',
//     description:
//       'ksfsjkdfkshdkfjhskjdfhsjkhfkshdfkjhskjdfhjksdhfkjshdjkfhsjkdfhkjsdfjkhssdfsdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfsjsdfjkhssdfsdfs',
//   },
// ])

const isLoading = ref(false)
const errorMessage = ref('')
const isLogin = authStore.isAuthenticated

// const handleLogin = async () => {
//   isLoading.value = true;
//   errorMessage.value = '';
//   try {
//     // 1. เรียก Service เพื่อเอา Login URL
//     const loginUrl = await authService.getLoginUrl();
//     console.log('Login URL:', loginUrl);
//     // 2. ส่งผู้ใช้ไปที่ Keycloak
//     window.location.href = loginUrl;
//   } catch (error) {
//     errorMessage.value = 'เกิดข้อผิดพลาดในการเริ่มระบบ Login';
//     console.error('Login Error:', error);
//     isLoading.value = false;
//   }
// };

const handleLogin = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await authService.startLoginRedirect()
  } catch (error) {
    console.error('Login Error:', error)
    errorMessage.value = 'เกิดข้อผิดพลาดในการเริ่มระบบ Login'
    isLoading.value = false
  }
}

const handleLogout = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await authService.getLogoutUrl()
  } catch (error) {
    console.error('Logout Error:', error)
    errorMessage.value = 'เกิดข้อผิดพลาดในการเริ่มระบบ Logout'
    isLoading.value = false
  }
}

function formatDate(date: string | number | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

const goToPage = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="min-h-screen">
    <NavBar HeadText="SIT Event">
      <template #right>
        <div class="flex flex-row">
          <!-- <button @click="ChangeLng">{{ AppLang }}</button> -->
          <div>{{ authStore.userFullName }}</div>
          <div>{{ authStore.user?.userRole }}</div>
          <div v-if="authStore.isAuthenticated" class="w-7 h-7 items-center">
            <img
              src="../../../assets/images/mock_profile.png"
              alt="mockProfile"
              class="w-full h-full object-cover rounded-full items-center"
            />
          </div>
          <div class="w-5"></div>
          <div>
            <!-- Hamburger Button -->
            <div class="relative">
              <button class="items-center" @click.stop="toggleMenu" ref="menuButton">
                <img src="../../../../src/assets/icons/hamburger.svg" alt="hamburger" />
              </button>

              <!-- Floating Menu -->
              <transition name="fade">
                <div
                  v-if="isOpenMenu"
                  ref="menuRef"
                  class="absolute right-0 mt-3 flex flex-col gap-3 bg-white rounded-xl p-4 w-56 shadow-lg border border-slate-200 z-50"
                >
                  <button
                    v-if="authStore.user?.userRole == 'STAFF'"
                    @click="goToPage(`/myregistrations`)"
                    class="flex flex-row items-center w-full hover:bg-slate-100 rounded-lg p-2"
                  >
                    <img
                      src="../../../assets/icons/mybooking_icon.svg"
                      alt="Member"
                      class="w-5 h-5"
                    />
                    <span class="ml-3 font-medium">My Staffing</span>
                  </button>
                  <button
                    v-else
                    @click="goToPage(`/myregistrations`)"
                    class="flex flex-row items-center w-full hover:bg-slate-100 rounded-lg p-2"
                  >
                    <img
                      src="../../../assets/icons/mybooking_icon.svg"
                      alt="Member"
                      class="w-5 h-5"
                    />
                    <span class="ml-3 font-medium">My Bookings</span>
                  </button>

                  <button
                    @click="console.log('Edit Profile')"
                    class="flex flex-row items-center w-full hover:bg-slate-100 rounded-lg p-2"
                  >
                    <img
                      src="../../../assets/icons/edit_profile_icon.svg"
                      alt="Edit Profile"
                      class="w-5 h-5"
                    />
                    <span class="ml-3 font-medium">Edit Profile</span>
                  </button>

                  <button
                    @click="ChangeLng"
                    class="flex flex-row items-center w-full hover:bg-slate-100 rounded-lg p-2"
                  >
                    <img
                      src="../../../assets/icons/language_icon.svg"
                      alt="Change Language"
                      class="w-5 h-5"
                    />
                    <span class="ml-3 font-medium">{{ AppLang }}</span>
                  </button>

                  <button
                    @click="console.log('Help')"
                    class="flex flex-row items-center w-full hover:bg-slate-100 rounded-lg p-2"
                  >
                    <img src="../../../assets/icons/help_icon.svg" alt="Help" class="w-5 h-5" />
                    <span class="ml-3 font-medium">Help</span>
                  </button>

                  <button
                    v-if="isLogin"
                    @click="handleLogout"
                    class="flex flex-row items-center w-full hover:bg-slate-100 rounded-lg p-2 text-red-600"
                  >
                    <img src="../../../assets/icons/logout_icon.svg" alt="Logout" class="w-5 h-5" />
                    <span class="ml-3 font-medium">Logout</span>
                  </button>
                  <button
                    v-else
                    @click="handleLogin"
                    class="flex flex-row items-center w-full hover:bg-slate-100 rounded-lg p-2"
                  >
                    <img src="../../../assets/icons/login_icon.svg" alt="Login" class="w-6 h-6" />
                    <span class="ml-3 font-medium">Login</span>
                  </button>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </template>
    </NavBar>
    <div>
      <!-- Swiper Section -->
      <div class="flex flex-row">
        <swiper
          :modules="[Pagination, Autoplay]"
          :slides-per-view="1"
          :loop="true"
          :pagination="{ clickable: true }"
          :autoplay="{ delay: 4000 }"
          class="w-full h-[600px] max-w-md mx-auto rounded-sm overflow-hidden"
        >
          <swiper-slide
            v-for="(slide, i) in slides"
            :key="i"
            class="flex flex-col items-center h-full justify-between text-center text-white p-6 bg-gradient-to-b from-blue-500 to-blue-800"
          >
            <div class="p-6">
              <h2 class="text-2xl font-bold mb-3">{{ slide.title }}</h2>
              <hr class="w-20 border-t-2 border-white rounded mx-auto my-10" />
              <img
                src="../../../assets/images/sit_logo.png"
                alt="Sit Logo"
                class="w-64 mx-auto my-10"
              />
              <p class="text-sm mb-4">{{ slide.desc }}</p>
            </div>
            <div class="p-6">
              <button class="bg-white text-blue-800 font-semibold py-2 px-4 rounded-sm shadow">
                {{ slide.button }}
              </button>
            </div>
          </swiper-slide>
          <!-- :style="{ backgroundImage: `url(${slide.image})` }" -->
        </swiper>
      </div>
      <!-- Upcoming Events Section -->
      <div>
        <div class="flex flex-col">
          <div class="text-lg font-semibold mt-4 ml-3">Upcoming Events</div>
          <div class="h-3"></div>
          <div>
            <div v-for="(event, index) in events" :key="index" class="h-auto rounded-lg mb-3">
              <div @click="goToPage(`/event/${event.id}`)" class="mb-10">
                <div class="p-3">
                  <img
                    src="../../../assets/images/mock_sub_session1.png"
                    class="w-full h-52 object-cover rounded-lg"
                  />
                </div>

                <!-- todo : bring back when image URLs are available -->
                <div>
                  <div class="flex flex-col h-auto">
                    <div>
                      <div class="p-3 pt-0 pb-0">
                        <div class="text-xl font-semibold mb-2">
                          {{ event.name }}
                        </div>
                        <div class="text-slate-500 desc-clamp">
                          {{ event.description }}
                        </div>
                      </div>
                      <div class="flex justify-between pt-3 pl-3 items-center">
                        <div class="text-lg text-slate-500">
                          {{ formatDate(event.eventStartDate) }}
                        </div>
                        <div v-if="authStore.user?.userRole == 'STAFF'">
                          <button
                            class="mx-auto my-2 p-1 px-3 w-full text-white text-sm rounded-l-md bg-blue-500"
                          >
                            Apply as Staff
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div class="flex flex-row justify-center mb-4">
              <paginationComponent
                v-model="currentPage"
                :count="paginations?.totalPages"
                responsive
                @page-change="handlePageChange"
                @limit-change="handleLimitChange"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.swiper-pagination-bullet {
  background-color: rgba(0, 0, 0, 0.4);
  width: 10px;
  height: 10px;
  opacity: 1;
  transition: all 0.3s;
}

.swiper-pagination-bullet-active {
  background-color: white;
  width: 20px;
  border-radius: 10px;
}
:deep(.swiper-pagination) {
  background: rgba(10, 30, 50, 0.6); /* ดำเข้มหน่อย */
  padding: 5px 5px;
  border-radius: 9999px;
  bottom: 16px !important;
  width: auto !important;
  left: 50%;
  transform: translateX(-50%);
  display: flex !important;
  justify-content: center;
  align-items: center;
  gap: 2px;
}

:deep(.swiper-pagination-bullet) {
  width: 7px;
  height: 7px;
  background: rgba(255, 255, 255, 0.35); /* เทาอ่อน */
  opacity: 1;
  transition: all 0.3s ease;
}

:deep(.swiper-pagination-bullet-active) {
  background: #ffffff; /* จุด active เป็นขาว */
  width: 7px;
  height: 7px;
}

.desc-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal; /* ✅ อนุญาตให้ขึ้นบรรทัดใหม่ได้ */
  word-break: break-word; /* ✅ ตัดคำกลางประโยคได้ถ้าคำยาวเกิน */
}
</style>
