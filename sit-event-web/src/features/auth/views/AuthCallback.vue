<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import authService from '../services/auth.service';
// (Optional) import { useAuthStore } from '../stores/auth.store';

const router = useRouter();
// const authStore = useAuthStore(); // (Optional)

const message = ref('กำลังยืนยันตัวตน, กรุณารอสักครู่...');
const error = ref('');

onMounted(async () => {
  // 1. ดึง 'code' ออกมาจาก URL
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (!code) {
    error.value = 'ไม่พบ Authorization Code, กำลังกลับไปหน้าหลัก...';
    setTimeout(() => router.push('/'), 3000);
    return;
  }

  try {
    // 2. ส่ง Code ให้ Backend
    const { user } = await authService.handleAuthCallback(code);

    // 3. (Optional) เก็บ User ใน Pinia Store
    // authStore.setUser(user);

    message.value = 'Login สำเร็จ! กำลังนำคุณไปยัง Dashboard...';
    
    // 4. ส่งไปหน้า Dashboard
    router.push('/'); // หรือหน้า /

  } catch (authError) {
    error.value = 'การยืนยันตัวตนล้มเหลว, กำลังกลับไปหน้าหลัก...';
    console.error('Auth Callback Error:', authError);
    setTimeout(() => router.push('/'), 3000);
  }
});
</script>

<template>
  <div>
    <h2>{{ message }}</h2>
    <p v-if="error" style="color: red;">{{ error }}</p>
  </div>
</template>