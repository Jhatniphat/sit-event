# using in .vue
```vue
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'

// 1. ดึง Store มาใช้งาน
const authStore = useAuthStore()

// (ไม่จำเป็นต้องมี Logic เพิ่มเติมใน script)
// เราสามารถเรียกใช้ Getters และ Actions จาก Template ได้โดยตรง
</script>

<template>
  <div>
    <div v.if="authStore.isAuthenticated">
      
      <p>สวัสดี, {{ authStore.userFullName }}</p>

      <button @click="authStore.logout()">Logout</button>
    </div>
    
    <div v-else>
      <p>คุณยังไม่ได้ Login</p>
      
      <button @click="authStore.startLogin()">Login</button>
    </div>
  </div>
</template>
```

# using in app.vue
```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

onMounted(async () => {
  // 1. เรียก Action 'checkSession' ทุกครั้งที่แอปโหลด
  // (Store จะยิง API /auth/me เพื่อเช็ค Cookie ที่มีอยู่)
  // (ถ้า Cookie ถูกต้อง, State 'user' จะถูกเติม)
  await authStore.checkSession()
})
</script>

<template>
  <router-view />
</template>
```