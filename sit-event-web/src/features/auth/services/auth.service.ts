import apiClient from '@/shared/utils/FetchUtils'; 

// --- 1. อัปเดต Type Definitions ---
interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userRole: string;
}

interface LoginCallbackResponse {
  message: string;
  user: AuthUser;
  sessionCreated: boolean;
  accessToken: string;  // 👈 [เพิ่ม]
  refreshToken: string; // 👈 [เพิ่ม]
}

interface SessionData {
  sessionId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userRole: string;
  accessToken?: string;  
  refreshToken?: string; 
}

interface SessionValidationResponse {
  valid: boolean;
  message: string;
  session?: SessionData; 

}

interface LoginUrlResponse {
  loginUrl: string;
  message: string;
}

interface LogoutUrlResponse {
  logoutUrl: string;
  message: string;
}


class AuthService {

  // * -------------------------------------------------------------------------- Auth Callback --------------------------------------------------------------------------
  
  /**
   * (B) จัดการ Callback (เรียกโดย Store)
   */
  async handleAuthCallback(code: string): Promise<LoginCallbackResponse> { 
    try {
      const response = await apiClient.get(
        '/auth/callback', 
        {
          params: { code: code }
        }
      ) as LoginCallbackResponse; 

      return response; 
      
    } catch (error) {
      console.error('Error handling auth callback:', error);
      throw new Error('Authentication failed');
    }
  }

  // * -------------------------------------------------------------------------- Login Flow --------------------------------------------------------------------------
  
  /**
   * (A) เริ่มกระบวนการ Login (เรียกโดย Store)
   */
  async startLoginRedirect(): Promise<void> {
    try {
      const response = await apiClient.get(
        '/auth/login-url',
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      ) as LoginUrlResponse; 

      if (!response || !response.loginUrl) {
        console.error('❌ Server OK, but loginUrl is missing!', response);
        throw new Error('Server responded OK, but loginUrl data is missing.');
      }
      
      const loginUrl = response.loginUrl;
      
      window.location.href = loginUrl;

    } catch (error) {
      console.error('Error during login redirect:', error);
      throw new Error('Could not start login process');
    }
  }

  // * -------------------------------------------------------------------------- Logout Flow --------------------------------------------------------------------------
  
  /**
   * (D) ดึง URL สำหรับ Logout (เรียกโดย Store)
   */
  async getLogoutUrl(): Promise<LogoutUrlResponse> {
    try {
      const response = await apiClient.get(
        '/auth/logout-url', 
        {
          headers: {
            'Cache-Control': 'no-cache',
          }
        }
      ) as LogoutUrlResponse;
      
      return response;
    } catch (error) {
      console.error('Failed to get logout URL:', error);
      throw new Error('Failed to get logout URL');
    }
  }

  async startLogoutRedirect(): Promise<void> {
    try {
      const response = await apiClient.get(
        '/auth/logout-url',
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      ) as LogoutUrlResponse; 

      if (!response || !response.logoutUrl) {
        console.error('❌ Server OK, but logoutUrl is missing!', response);
        throw new Error('Server responded OK, but logoutUrl data is missing.');
      }
      
      const logoutUrl = response.logoutUrl;
      
      window.location.href = logoutUrl;

    } catch (error) {
      console.error('Error during login redirect:', error);
      throw new Error('Could not start login process');
    }
  }

    async logout(): Promise<void> {
    try {
      await apiClient.get(
        '/auth/logout',
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      ) 

    } catch (error) {
      console.error('Error during logout redirect:', error);
      throw new Error('Could not complete logout process');
    }
  }


  // * -------------------------------------------------------------------------- Check Session --------------------------------------------------------------------------
  
  /**
   * (C) ตรวจสอบ Session (เรียกโดย Store ตอนเปิดแอป)
   */
  async checkSession(): Promise<SessionValidationResponse> {
    try {
      const response = await apiClient.get('/auth/session', {
        headers: {
          'Cache-Control': 'no-cache', 
        }
      }) as SessionValidationResponse; 
      return response;
    } catch (error) {
      console.error('Failed to validate session:', error);
      return { valid: false, message: 'Not authenticated' };
    }
  }
  
}

export default new AuthService();