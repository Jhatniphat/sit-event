<script setup lang="ts">
// import { onMounted } from 'vue';
// import { useAuthStore } from '@/features/auth/stores/auth.store';

// const authStore = useAuthStore();

// onMounted(async () => {
//   const code = new URLSearchParams(window.location.search).get('code');
//   if (code) {
//     await authStore.handleLoginCallback(code); 
//   }
// });

// ในหน้า LoginCallback.vue หรือ App.vue
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/stores/auth.store';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

onMounted(async () => {
  const code = route.query.code as string;
  if (code) {
    authStore.handleLoginCallback(code)
    router.replace({ path: '/' });
  }

  console.log('Auth Callback Login Mounted');
});
</script>

<template>
  <div>
    <p>กำลังดำเนินการตรวจสอบการเข้าสู่ระบบ...</p>
  </div>
</template>