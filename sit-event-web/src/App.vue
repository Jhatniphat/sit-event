<script setup lang="ts">
import { onMounted } from 'vue'
// import NavBar from './components/ui/commons/NavBar.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const authStore = useAuthStore()
onMounted(async () => {
  // 1. เรียก Action 'checkSession' ทุกครั้งที่แอปโหลด
  // (Store จะยิง API /auth/me เพื่อเช็ค Cookie ที่มีอยู่)
  // (ถ้า Cookie ถูกต้อง, State 'user' จะถูกเติม)
  await authStore.checkSession()
})
import ToastContainer from '@/features/toast/views/ToastContainer.vue'
import NavBar from './shared/components/NavBar.vue'
</script>

<template>
  <div>
    <div>
      <ToastContainer />
      <NavBar />
      <RouterView />
    </div>
  </div>
</template>
