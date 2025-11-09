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

// นี่คือ Type ที่ NestJS จะส่งกลับมา
interface AuthResponse {
  message: string;
  user: AuthUser;
  tokens: AuthToken;
}

class AuthService {
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
      // [FIX] เราจะใช้ 'as' เพื่อบอก TypeScript ว่า
      // ผลลัพธ์ที่ได้จาก await "คือ" object ที่มี loginUrl
      const response = await apiClient.get(
        '/auth/login-url',
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      ) as { loginUrl: string }; // <--- นี่คือส่วนที่เพิ่มเข้ามา

      // [FIX] เช็ค response.loginUrl โดยตรง
      if (!response || !response.loginUrl) {
        console.error('❌ Server OK, but loginUrl is missing!', response);
        throw new Error('Server responded OK, but loginUrl data is missing.');
      }
      
      // [FIX] เข้าถึง .loginUrl โดยตรง
      const loginUrl = response.loginUrl;
      console.log('✅ Success! Login URL:', loginUrl);
      
      window.location.href = loginUrl;

    } catch (error) {
      console.error('Error during login redirect:', error);
      throw new Error('Could not start login process');
    }
  }

  /**
   * 3. ส่ง Authorization Code ที่ได้จาก Keycloak กลับไปให้ Backend
   */
  async handleAuthCallback(code: string): Promise<AuthResponse> { // <--- เปลี่ยน any เป็น AuthResponse
    try {
      // [FIX] เราต้องส่ง 'code' เป็น 'params' ใน GET Request
      const response = await apiClient.get(
        '/auth/callback', // <-- Path นี้ถูกต้อง ตรงกับ @Get('callback')
        {
          // บอก Axios ให้สร้าง URL query string
          params: {
            code: code 
          }
        }
      ) as AuthResponse; // [FIX] ใช้ 'as' เพราะเรารู้ว่า Interceptor แกะ .data ให้แล้ว

      // [FIX] คืนค่า response ที่แกะแล้วโดยตรง
      return response; 
      
    } catch (error) {
      console.error('Error handling auth callback:', error);
      throw new Error('Authentication failed');
    }
  }



  // (Optional) เพิ่มฟังก์ชันเช็คสถานะ, logout ฯลฯ
  // async getProfile(): Promise<any> { ... }
  async logout(): Promise<{ logoutUrl: string }> {
    try {
      // (สำคัญ) ให้เปลี่ยน Endpoint นี้เป็น Endpoint จริงของ NestJS ที่คุณสร้างไว้
      const response = await apiClient.post<{ logoutUrl: string }>('/auth/logout-url');
      return response.data;
    } catch (error) {
      console.error('Error during logout:', error);
      throw new Error('Could not logout');
    }
  }
}

export default new AuthService();