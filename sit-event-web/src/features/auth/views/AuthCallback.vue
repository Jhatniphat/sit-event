<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '@/features/auth/stores/auth.store';

const authStore = useAuthStore();

onMounted(async () => {
  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    // Store จะจัดการเรียก Service, บันทึก User, และ Redirect เอง
    await authStore.handleLoginCallback(code); 
  }
});
</script>

<template>
  <div>
    <p>กำลังดำเนินการตรวจสอบการเข้าสู่ระบบ...</p>
  </div>
</template>