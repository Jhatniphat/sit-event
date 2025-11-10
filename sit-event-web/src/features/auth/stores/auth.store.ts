// src/stores/auth.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import authService from '@/features/auth/services/auth.service'; 

// (สร้าง Type ของ User ที่จะเก็บใน Store)
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export const useAuthStore = defineStore('auth', () => {
  // --- 1. STATE ---
  // สถานะของ User ที่ Login อยู่ (สำหรับแสดงผลใน UI)
  const user = ref<AuthUser | null>(null);
  const router = useRouter();

  // --- 2. GETTERS ---
  // Getter สำหรับเช็คว่า Login แล้วหรือยัง
  const isAuthenticated = computed(() => !!user.value);
  // Getter สำหรับดึงชื่อ User
  const userFullName = computed(() => {
    if (user.value) {
      return `${user.value.firstName} ${user.value.lastName}`;
    }
    return '';
  });

  // --- 3. ACTIONS ---

  /**
   * (A) สั่งให้ Redirect ไปหน้า Keycloak
   * (เรียกใช้โดย: ปุ่ม Login)
   */
  async function startLogin() {
    try {
      // เรียก Service ให้จัดการ Redirect (เราทำไปแล้ว)
      await authService.startLoginRedirect();
    } catch (error) {
      console.error('Login failed to start:', error);
      // (อาจจะแสดง Error UI)
    }
  }

  /**
   * (B) จัดการ Callback หลังจาก Keycloak ส่งกลับมา
   * (เรียกใช้โดย: หน้า AuthCallback.vue)
   */
  async function handleLoginCallback(code: string) {
    try {
      // เรียก Service ให้ส่ง code ไป NestJS
      // NestJS จะตั้ง Cookie ให้เรา และส่งข้อมูล User กลับมา
      const response = await authService.handleAuthCallback(code);

      // เก็บข้อมูล User ที่ได้ ลง State
      user.value = response.user;
      
      // ส่งกลับไปหน้า Dashboard
      router.push('/dashboard'); 
    } catch (error) {
      console.error('Login callback failed:', error);
      router.push('/'); // ถ้าพัง ให้กลับหน้าแรก
    }
  }

  /**
   * (C) ตรวจสอบ Session ตอนเปิดแอป
   * (เรียกใช้โดย: App.vue ตอน onMounted)
   */
  async function checkSession() {
    try {
      const response = await authService.getMe();
      user.value = response.user;
    } catch (error) {
      console.error('No active session:', error);
      user.value = null;
    }
  }

  /**
   * (D) สั่ง Logout
   * (เรียกใช้โดย: ปุ่ม Logout)
   */
  async function logout() {
    try {
      // 1. (สำคัญ) เรียก Service เพื่อเอา URL Logout จาก NestJS
      const { logoutUrl } = await authService.getLogoutUrl();
      
      // 2. ล้าง State ของ User ใน Pinia
      user.value = null;
      
      // 3. ส่งผู้ใช้ไป Logout ที่ Keycloak (และล้าง Cookie ฝั่ง NestJS)
      window.location.href = logoutUrl;

    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  // คืนค่าทั้งหมดให้ Component เรียกใช้
  return {
    user,
    isAuthenticated,
    userFullName,
    startLogin,
    handleLoginCallback,
    checkSession,
    logout,
  };
});