<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDashboardStore } from '../store/DashboardStore'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Users, UserCheck, Activity, CalendarDays, ExternalLink } from 'lucide-vue-next'
import { useEventStore } from '../store/EventStore'
import { ref, watch } from 'vue'

const route = useRoute()
const router = useRouter()
const dashboardStore = useDashboardStore()

const eventId = String(route.params.id)
const eventStore = useEventStore()

onMounted(async () => {
  await dashboardStore.fetchEventStats(eventId)
  await eventStore.fetchEventSessions(eventId)
  
  if (eventStore.currentEventSessions.length > 0) {
    const sessionIds = eventStore.currentEventSessions.map(s => s.id)
    await dashboardStore.fetchAllSessionStats(sessionIds)
  }
})

onUnmounted(() => {
  dashboardStore.clearStats()
})

const statsData = computed(() => dashboardStore.stats)
const sessions = computed(() => eventStore.currentEventSessions)
const sessionStatsRecord = computed(() => dashboardStore.sessionStatsRecord)

const isLoading = computed(() => dashboardStore.isLoading)
const error = computed(() => dashboardStore.error)

const goToApproved = () => {
  router.push({ name: 'ParticipantApproval', params: { id: eventId } })
}

const goBack = () => {
  router.push({ name: 'OrgEventView' })
}

const formatDate = (dateString: string) => {
  const d = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-8">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
        <div class="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg flex items-center justify-center min-h-[400px]">
        <p>{{ error }}</p>
      </div>

      <!-- Content -->
      <template v-else-if="statsData">
        <!-- Header -->
        <div class="flex items-center gap-4">
          <button @click="goBack" class="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft class="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 class="text-3xl font-bold tracking-tight text-gray-900">{{ statsData.event.name }} Dashboard</h1>
            <p class="text-gray-500 mt-1 flex items-center gap-2">
              <CalendarDays class="w-4 h-4" />
              {{ formatDate(statsData.event.dates.start) }} - {{ formatDate(statsData.event.dates.end) }}
              <span class="px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-100 text-blue-700 border-blue-200 ml-2">
                {{ statsData.event.status }}
              </span>
            </p>
          </div>
        </div>

        <!-- Top Metrics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">Total Registrations</CardTitle>
              <Users class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">{{ statsData.stats.totalRegistrations }}</div>
              <p class="text-xs text-muted-foreground mt-1">Participants applied</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">Attended</CardTitle>
              <UserCheck class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">{{ statsData.stats.attended }}</div>
              <p class="text-xs text-muted-foreground mt-1">{{ statsData.stats.checkedInPercentage }}% check-in rate</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">Capacity Used</CardTitle>
              <Activity class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">{{ statsData.stats.capacity.used }} / {{ statsData.stats.capacity.total }}</div>
              <Progress :model-value="statsData.stats.capacity.percentage" class="mt-3 bg-gray-100" />
              <p class="text-xs text-muted-foreground mt-2">{{ statsData.stats.capacity.remaining }} seats remaining</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">Staff Members</CardTitle>
              <Users class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">{{ statsData.stats.totalStaff }}</div>
              <p class="text-xs text-muted-foreground mt-1">Assigned to this event</p>
            </CardContent>
          </Card>
        </div>

        <!-- Detailed Analytics section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Registration Status Breakdown</CardTitle>
              <CardDescription>Current state of participant applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div class="flex items-center">
                  <span class="w-24 text-sm font-medium">Approved</span>
                  <div class="flex-1 flex justify-between items-center ml-4 border rounded p-2 bg-green-50">
                    <span class="text-sm text-green-700 font-bold">{{ statsData.stats.registrationStatus.approved }}</span>
                    <button @click="goToApproved" class="text-green-700 hover:text-green-900" title="Manage approvals">
                      <ExternalLink class="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <Separator />
                <div class="flex items-center">
                  <span class="w-24 text-sm font-medium">Pending</span>
                  <div class="flex-1 ml-4 border rounded p-2 bg-yellow-50">
                    <span class="text-sm text-yellow-700 font-bold">{{ statsData.stats.registrationStatus.pending }}</span>
                  </div>
                </div>
                <Separator />
                <div class="flex items-center">
                  <span class="w-24 text-sm font-medium">Rejected</span>
                  <div class="flex-1 ml-4 border rounded p-2 bg-red-50">
                    <span class="text-sm text-red-700 font-bold">{{ statsData.stats.registrationStatus.rejected }}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Sub-Sessions Display -->
        <div v-if="sessions.length > 0" class="mt-10">
          <h2 class="text-2xl font-bold tracking-tight text-gray-900 mb-6">Sub-Sessions</h2>

          <div class="space-y-6">
            <template v-for="session in sessions" :key="session.id">
              <div v-if="sessionStatsRecord[session.id]" class="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <h3 class="text-xl font-semibold mb-4">{{ session.name }}</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Session Registrations -->
                  <Card>
                    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle class="text-sm font-medium">Registrations</CardTitle>
                      <Users class="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div class="text-2xl font-bold">{{ sessionStatsRecord[session.id]?.stats.totalRegistrations }}</div>
                    </CardContent>
                  </Card>

                  <!-- Session Attended -->
                  <Card>
                    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle class="text-sm font-medium">Attended</CardTitle>
                      <UserCheck class="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div class="text-2xl font-bold">{{ sessionStatsRecord[session.id]?.stats.attended }}</div>
                      <p class="text-xs text-muted-foreground mt-1">{{ sessionStatsRecord[session.id]?.stats.checkedInPercentage }}% check-in rate</p>
                    </CardContent>
                  </Card>

                  <!-- Session Capacity -->
                  <Card>
                    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle class="text-sm font-medium">Capacity</CardTitle>
                      <Activity class="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div class="text-2xl font-bold">{{ sessionStatsRecord[session.id]?.stats.capacity.used }} / {{ sessionStatsRecord[session.id]?.stats.capacity.total }}</div>
                      <Progress :model-value="sessionStatsRecord[session.id]?.stats.capacity.percentage" class="mt-3 bg-gray-100" />
                      <p class="text-xs text-muted-foreground mt-2">{{ sessionStatsRecord[session.id]?.stats.capacity.remaining }} seats remaining</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </template>
          </div>
        </div>


      </template>
    </div>
  </div>
</template>

<style scoped></style>
