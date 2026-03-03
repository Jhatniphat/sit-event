<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Pencil } from 'lucide-vue-next'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useUserStore } from '../store/UserStore'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

onMounted(async () => {
  await userStore.fetchMyProfile()
})

const userInitials = computed(() => {
  if (!userStore.profile) return 'UE'
  return `${userStore.profile.firstName.charAt(0)}${userStore.profile.lastName.charAt(0)}`.toUpperCase()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-4 sm:p-8">
    <div class="max-w-4xl mx-auto">
      <div class="border rounded-2xl p-5 sm:p-8 bg-white relative">
        <Button
          variant="outline"
          size="icon"
          class="absolute top-5 right-5 sm:top-8 sm:right-8"
          @click="router.push('/profile/me/edit')"
        >
          <Pencil class="h-4 w-4" />
        </Button>

        <div class="flex flex-col sm:flex-row items-center gap-6">
          <Avatar class="h-24 w-24 border shrink-0">
            <AvatarFallback>{{ userInitials }}</AvatarFallback>
          </Avatar>

          <div class="flex-1 text-center sm:text-left space-y-1">
            <h1 class="text-xl sm:text-2xl font-bold">
              {{ userStore.profile?.firstName }} {{ userStore.profile?.lastName }}
            </h1>
            <p class="text-gray-500 text-sm sm:text-md">{{ userStore.profile?.email }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 border-t pt-6">
          <div>
            <Label class="text-gray-400">เบอร์โทรศัพท์</Label>
            <p class="text-lg">{{ userStore.profile?.phoneNumber || '-' }}</p>
          </div>
          <div>
            <Label class="text-gray-400">จังหวัด</Label>
            <p class="text-lg">{{ userStore.profile?.province || '-' }}</p>
          </div>
          <div>
            <Label class="text-gray-400">บทบาทในโรงเรียน</Label>
            <p class="text-lg">{{ userStore.profile?.roleInSchool || '-' }}</p>
          </div>
          <div>
            <Label class="text-gray-400">โรงเรียน</Label>
            <p class="text-lg">{{ userStore.profile?.school || '-' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
