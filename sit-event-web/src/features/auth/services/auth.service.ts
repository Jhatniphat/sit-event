import apiClient from '@/shared/utils/FetchUtils';
// --- (แนะนำ) สร้าง Type Definitions สำหรับการตอบกลับ ---
interface AuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthResponse {
  message: string;
  user: AuthUser;
  tokens: AuthToken;
}

class AuthService {

  // * -------------------------------------------------------------------------- Auth Callback --------------------------------------------------------------------------
  
  async handleAuthCallback(code: string): Promise<AuthResponse> { 
    try {
      const response = await apiClient.get(
        '/auth/callback', 
        {
          params: {
            code: code 
          }
        }
      ) as AuthResponse; 

      return response; 
      
    } catch (error) {
      console.error('Error handling auth callback:', error);
      throw new Error('Authentication failed');
    }
  }

  // * -------------------------------------------------------------------------- Login Flow --------------------------------------------------------------------------
  
  async getLoginUrl(): Promise<string> {
    try {
      const response = await apiClient.get<{ loginUrl: string , message: string }>(
        '/auth/login-url', 
      ); 
      
      console.log('Fetched login URL from backend:', response.data.loginUrl);
      return response.data.loginUrl;
    } catch (error) {
      console.error('Error fetching login URL:', error);
      throw new Error('Could not get login URL');
    }
  }

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
      ) as { loginUrl: string };

      if (!response || !response.loginUrl) {
        console.error('❌ Server OK, but loginUrl is missing!', response);
        throw new Error('Server responded OK, but loginUrl data is missing.');
      }
      
      const loginUrl = response.loginUrl;
      console.log('✅ Success! Login URL:', loginUrl);
      
      window.location.href = loginUrl;

    } catch (error) {
      console.error('Error during login redirect:', error);
      throw new Error('Could not start login process');
    }
  }

  // * -------------------------------------------------------------------------- Logout Flow --------------------------------------------------------------------------
  
  async getLogoutUrl(): Promise<{ logoutUrl: string }> {
    try {
      const response = await apiClient.get('/auth/logout-url', {
        headers: {
          'Cache-Control': 'no-cache', // (กัน 304)
        }
      }) as { logoutUrl: string };
      return response;
    } catch (error) {
      console.error('Failed to get logout URL:', error);
      throw new Error('Failed to get logout URL');
    }
  }

  async startLogoutRedirect(): Promise<void> {
    try {
      const response = await this.getLogoutUrl();
      window.location.href = response.logoutUrl;
    } catch (error) {
      console.error('Error during logout redirect:', error);
      throw new Error('Could not start logout process');
    } 
  }

  // * -------------------------------------------------------------------------- Get Me --------------------------------------------------------------------------
  async getMe(): Promise<AuthResponse> {
    try {
      const response = await apiClient.get('/auth/me', {
        headers: {
          'Cache-Control': 'no-cache', // (กัน 304)
        }
      }) as AuthResponse;
      return response;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw new Error('Not authenticated');
    }
  }
  
}

export default new AuthService();