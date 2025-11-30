import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import authService from '@/features/auth/services/auth.service';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userRole: string;
}

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const user = ref<AuthUser | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const router = useRouter();

  // --- GETTERS ---
  const isAuthenticated = computed(() => {
    console.log('Checking if user is authenticated...', !!user.value && !!accessToken.value);
    console.log('User:', user.value);
    console.log('Access Token:', accessToken.value);
    return !!user.value && !!accessToken.value
  });
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
    console.log('Starting login process...');
    if (isAuthenticated.value) {
      console.log('User is already authenticated, skipping login redirect.');
      return;
    }
    try {
      await authService.startLoginRedirect();
    } catch (error) {
      console.error('Login failed to start:', error);
    }
  }

  function loginRedirect() {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/login`;
  }
  
  function logoutRedirect() {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/logout`;
  }
  /**
   * (B) จัดการ Callback (หลังจาก Login ที่ Keycloak)
   */
  async function handleLoginCallback(code: string) {
    try {
      const response = await authService.handleAuthCallback(code);
      // await authService.handleAuthCallback(code);
      const sessionResponse = await authService.checkSession();

      user.value = response.user;
      accessToken.value = sessionResponse.session?.accessToken || null;
      refreshToken.value = sessionResponse.session?.refreshToken || null;
      
      router.push({ name: 'Home' });
    } catch (error) {
      console.error('Login callback failed:', error);
      router.push({ name: 'Home' });
    }
  }

  /**
   * (C) ตรวจสอบ Session (ตอนเปิดแอป)
   */
  async function checkSession() {
    try {
      const response = await authService.checkSession();
      if (response.valid && response.session && response.session.accessToken) {

        console.log('Restoring session for user');

        user.value = {
          id: response.session.userId,
          email: response.session.email,
          firstName: response.session.firstName,
          lastName: response.session.lastName,
          userRole: response.session.userRole,
        };

        accessToken.value = response.session.accessToken ?? null;
        refreshToken.value = response.session.refreshToken ?? null;

      } else {
        user.value = null;
        accessToken.value = null;
        refreshToken.value = null;
      }
    } catch (error) {
      console.error('Error checking session:', error);
      user.value = null;
      accessToken.value = null;
      refreshToken.value = null;
    }
  }

  /**
   * (D) สั่ง Logout
   */
  // async function logout() {
  //   try {
  //     // const { logoutUrl } = await authService.getLogoutUrl();
  //     user.value = null;
  //     accessToken.value = null;
  //     refreshToken.value = null;

  //     // window.location.href = logoutUrl;
  //     await authService.startLogoutRedirect();

  //   } catch (error)      {
  //     console.error('Logout failed:', error);
  //   }
  // }

  async function startLogout() {
    try {
      await authService.startLogoutRedirect();
    } catch (error) {
      console.error('Logout failed to start:', error);
    }
  }

  async function handleLogoutCallback() {
    try {
      // const response = await authService.handleAuthCallback(code);
      await authService.logout();
      user.value = null;
      accessToken.value = null;
      refreshToken.value = null;

      router.push({ name: 'Home' });
    } catch (error) {
      console.error('Login callback failed:', error);
      router.push({ name: 'Home' });
    }
  }

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    userFullName,
    startLogin,
    handleLoginCallback,
    checkSession,
    startLogout,
    handleLogoutCallback,
    loginRedirect,
    logoutRedirect,
  };
});