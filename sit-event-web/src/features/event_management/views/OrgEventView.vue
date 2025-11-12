<script setup lang="ts">
import BaseButton from '@/components/ui/button/BaseButton.vue'
import { ref, computed, onMounted } from 'vue'
import EventListing from '@/features/event_management/components/EventListing.vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '@/features/event_management/store/EventStore'

const eventStore = useEventStore()
const router = useRouter()
const sideBarMenu = ref('Events')

const ChangeEventView = (page: string) => {
  router.push(`/event/${page}`)
}

const changeSideBarMenu = (menu: string) => {
  sideBarMenu.value = menu
}

const events = computed(() => eventStore.events)
const isLoading = computed(() => eventStore.isLoadingList)
const error = computed(() => eventStore.error)
</script>

<template>
  <div class="flex flex-col h-screen">
    <div class="flex flex-row p-8 mx-3 h-full">
      <div class="flex-3 container">
        <div class="flex flex-col justify-between h-full">
          <div>
            <div class="text-xl">Evently</div>
            <div class="h-8"></div>
            <div class="flex flex-col gap-2">
              <div>
                <button
                  class="w-full px-3 py-2 rounded-md hover:bg-slate-100"
                  :class="{ 'bg-slate-100 font-semibold': sideBarMenu === 'Dashboard' }"
                  @click="changeSideBarMenu('Dashboard')"
                >
                  <div class="flex flex-row">
                    <img src="../../../assets/icons/home_icon.svg" />
                    <div class="w-3"></div>
                    <div class="focus:font-semibold">Dashboard</div>
                  </div>
                </button>
              </div>
              <div>
                <button
                  class="w-full px-3 py-2 rounded-md hover:bg-slate-100"
                  :class="{ 'bg-slate-100 font-semibold': sideBarMenu === 'Events' }"
                  @click="changeSideBarMenu('Events')"
                >
                  <div class="flex flex-row">
                    <img src="../../../assets/icons/calendar_icon.svg" />
                    <div class="w-3"></div>
                    <div>Events</div>
                  </div>
                </button>
              </div>
              <div>
                <button
                  class="w-full px-3 py-2 rounded-md hover:bg-slate-100"
                  :class="{ 'bg-slate-100 font-semibold': sideBarMenu === 'Participants' }"
                  @click="changeSideBarMenu('Participants')"
                >
                  <div class="flex flex-row">
                    <img src="../../../assets/icons/participant_icon.svg" />
                    <div class="w-3"></div>
                    <div class="focus:font-semibold">Participants</div>
                  </div>
                </button>
              </div>
              <div>
                <button
                  class="w-full px-3 py-2 rounded-md hover:bg-slate-100"
                  :class="{ 'bg-slate-100 font-semibold': sideBarMenu === 'Staff' }"
                  @click="changeSideBarMenu('Staff')"
                >
                  <div class="flex flex-row">
                    <img src="../../../assets/icons/staff_icon.svg" />
                    <div class="w-3"></div>
                    <div class="focus:font-semibold">Staff</div>
                  </div>
                </button>
              </div>
              <div>
                <button
                  class="w-full px-3 py-2 rounded-md hover:bg-slate-100"
                  :class="{ 'bg-slate-100 font-semibold': sideBarMenu === 'Setting' }"
                  @click="changeSideBarMenu('Setting')"
                >
                  <div class="flex flex-row">
                    <img src="../../../assets/icons/setting_icon.svg" />
                    <div class="w-3"></div>
                    <div class="focus:font-semibold">Setting</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div class="container">
            <div class="mx-2">
              <BaseButton
                @click="ChangeEventView('listing')"
                label="Event Listing"
                class="w-full"
                color="grey"
              />
            </div>
            <div class="h-4"></div>
            <div class="mx-2">
              <BaseButton @click="ChangeEventView('create')" label="New Event" class="w-full" />
            </div>
          </div>
        </div>
      </div>
      <div class="flex-8 p-2 mx-3 overflow-auto">
        <div v-if="sideBarMenu == 'Events'">
          <EventListing />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
