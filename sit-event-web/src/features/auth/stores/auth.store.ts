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
  const isAuthenticated = computed(() => !!user.value && !!accessToken.value); 
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
      accessToken.value = response.accessToken;
      refreshToken.value = response.refreshToken;

      router.push('/'); 
    } catch (error) {
      console.error('Login callback failed:', error);
      router.push('/'); 
    }
  }

  /**
   * (C) ตรวจสอบ Session (ตอนเปิดแอป)
   */
  async function checkSession() {
    try {
      const response = await authService.checkSession();
      console.log('Session check response:', response);
      console.log('Is session valid?:', response.valid);
      console.log('Session data:', response.session);
      console.log('Session accessToken:', response.session?.accessToken);
      console.log('Session refreshToken:', response.session?.refreshToken);

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

        console.log('User restored:', user.value);
        console.log('Access Token restored:', accessToken.value);
        console.log('Refresh Token restored:', refreshToken.value);

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
  async function logout() {
    try {
      const { logoutUrl } = await authService.getLogoutUrl();
      user.value = null;
      accessToken.value = null;
      refreshToken.value = null;
      
      window.location.href = logoutUrl;

    } catch (error)      {
      console.error('Logout failed:', error);
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
    logout,
  };
});