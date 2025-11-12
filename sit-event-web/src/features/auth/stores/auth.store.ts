import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
// (ตรวจสอบว่า Path ไปยัง auth.service.ts ถูกต้อง)
import authService from '@/features/auth/services/auth.service'; 

/**
 * Type สำหรับข้อมูล User ที่จะเก็บใน State
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userRole: string; // [FIX] เพิ่ม userRole (จาก NestJS DTO)
}

/**
 * Pinia Store สำหรับจัดการสถานะ Authentication
 */
export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const user = ref<AuthUser | null>(null);
  const router = useRouter();

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!user.value);
  const userFullName = computed(() => {
    return user.value 
      ? `${user.value.firstName} ${user.value.lastName}` 
      : '';
  });

  // --- ACTIONS ---

  /**
   * (A) เริ่มกระบวนการ Login
   */
  async function startLogin() {
    try {
      await authService.startLoginRedirect();
    } catch (error) {
      console.error('Login failed to start:', error);
    }
  }

  /**
   * (B) จัดการ Callback (หลังจาก Login ที่ Keycloak)
   */
  async function handleLoginCallback(code: string) {
    try {
      const response = await authService.handleAuthCallback(code);
      user.value = response.user; 
      router.push('/'); 
    } catch (error) {
      console.error('Login callback failed:', error);
      router.push('/'); 
    }
  }

  /**
   * (C) ตรวจสอบ Session (ตอนเปิดแอป)
   * [FIX] แก้ไข Logic ให้ทำงานกับ Endpoint /auth/session
   */
  async function checkSession() {
    try {
      // เรียก Service (ที่เรียก /auth/session)
      const response = await authService.checkSession();

      // (C.1) ถ้า Session ถูกต้อง (Backend คืน valid: true)
      if (response.valid && response.session) {
        // [FIX] เราจะดึงข้อมูล User จาก "session" object ที่ส่งกลับมา
        user.value = {
          id: response.session.userId,
          email: response.session.email,
          firstName: response.session.firstName,
          lastName: response.session.lastName,
          userRole: response.session.userRole,
        };
      } else {
        // (C.2) ถ้า Session ไม่ถูกต้อง (valid: false หรือ ไม่มี session)
        user.value = null;
      }
    } catch (error) {
      // (C.3) ถ้า API พัง (เช่น 500)
      console.error('Error checking session:', error);
      user.value = null;
    }
  }

  /**
   * (D) สั่ง Logout
   */
  async function logout() {
    try {
      // 1. เรียก NestJS เพื่อเอา Keycloak Logout URL
      // (Backend จะเคลียร์ Cookie และ Session ใน Redis/DB)
      const { logoutUrl } = await authService.getLogoutUrl();
      
      // 2. ล้าง State
      user.value = null;
      
      // 3. Redirect ไปที่ Keycloak (เพื่อ Logout จาก SSO)
      window.location.href = logoutUrl;

    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

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