<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Pencil, Trash2 } from 'lucide-vue-next'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useUserStore } from '../store/UserStore'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const userStore = useUserStore()
const authStore = useAuthStore()
const router = useRouter()
const showDeleteModal = ref(false)
const deleteState = ref<'idle' | 'confirming'>('idle')
let timer: ReturnType<typeof setTimeout> | null = null

const cancelDelete = () => {
  showDeleteModal.value = false
}

const deleteUser = async () => {
  const success = await userStore.deleteProfile()
  if (success) {
    toast.success('บัญชีถูกลบเรียบร้อยแล้ว')
    showDeleteModal.value = false
    authStore.logoutRedirect()
    router.push('/')
  } else {
    toast.error('เกิดข้อผิดพลาดในการลบบัญชี')
  }
}

const confirmDelete = () => {
  showDeleteModal.value = true
}
const handleTrashClick = () => {
  if (deleteState.value === 'idle') {
    // ครั้งที่ 1: เปลี่ยนเป็นสถานะยืนยัน
    deleteState.value = 'confirming'

    // ตั้งเวลา 3 วินาที ถ้าไม่กดครั้งที่ 2 ให้หุบกลับ
    timer = setTimeout(() => {
      deleteState.value = 'idle'
    }, 1500)
  } else {
    // ครั้งที่ 2: กดในสถานะยืนยัน ให้เคลียร์เวลา แล้วเปิด Modal
    if (timer) clearTimeout(timer)
    confirmDelete()
    // รีเซ็ตสถานะ
    deleteState.value = 'idle'
  }
}

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
        <div class="flex flex-col sm:flex-row gap-2 absolute top-5 right-5 sm:top-8 sm:right-8">
          <Button variant="outline" size="icon" class="" @click="router.push('/profile/me/edit')">
            <Pencil class="h-4 w-4" />
          </Button>
          <button
            @click="handleTrashClick"
            class="flex items-center gap-2 px-3 py-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-all duration-300 ease-in-out"
            :class="{ 'w-32': deleteState === 'confirming', 'w-10': deleteState === 'idle' }"
          >
            <Trash2 class="w-4 h-4 shrink-0" />

            <span
              v-if="deleteState === 'confirming'"
              class="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300"
            >
              Delete User
            </span>
          </button>
        </div>

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
            <Label class="text-gray-400">โรงเรียน/มหาวิทยาลัย</Label>
            <p class="text-lg">{{ userStore.profile?.school || '-' }}</p>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
        <p class="text-gray-500">
          Are you sure you want to delete this account? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-3 pt-2">
          <button
            @click="cancelDelete"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="deleteUser"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
