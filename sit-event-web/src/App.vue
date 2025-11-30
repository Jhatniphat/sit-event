<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import NavBar from './shared/components/NavBar.vue'
import { Loader2 } from 'lucide-vue-next' 
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'vue-sonner'

const authStore = useAuthStore()
const isAppLoading = ref<boolean>(true)

onMounted(async () => {
  try {
    await authStore.checkSession()
  } catch (error) {
    console.error('Session check failed:', error)
  } finally {
    setTimeout(() => {
      isAppLoading.value = false
      toast.success('Welcome to SIT Event')
    }, 500)
  }
})
</script>

<template>
  <div 
    v-if="isAppLoading" 
    class="fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center bg-white"
  >
    <div class="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-300">
      <Loader2 class="h-12 w-12 animate-spin text-slate-900" />
      
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome to SIT Event
        </h2>
        <p class="text-sm text-slate-500">
          We're getting things ready for you...
        </p>
      </div>
    </div>
  </div>

  <div v-else class="min-h-screen bg-background font-sans antialiased animate-in fade-in duration-500">
    <NavBar />
    <RouterView />
  </div>

  <Toaster position="top-center"/>
</template>