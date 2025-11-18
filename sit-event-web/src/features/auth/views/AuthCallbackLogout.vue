<script setup lang="ts">
import { onMounted } from 'vue';
import router from '@/router';

onMounted(async () => {
  // await authStore.handleLogoutCallback();
  router.replace({ path: '/' });
  console.log('Auth Callback Logout Mounted');
});
</script>

<template>
  <div>
    <p>กำลังดำเนินการตรวจสอบการออกจากระบบ...</p>
  </div>
</template>