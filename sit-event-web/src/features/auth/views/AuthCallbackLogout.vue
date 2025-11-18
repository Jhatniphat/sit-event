<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '@/features/auth/stores/auth.store';

const authStore = useAuthStore();

onMounted(async () => {
  await authStore.handleLogoutCallback(); 
});
</script>

<template>
  <div>
    <p>กำลังดำเนินการตรวจสอบการออกจากระบบ...</p>
  </div>
</template>