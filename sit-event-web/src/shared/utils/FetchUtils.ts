import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';
import { useAuthStore } from '@/features/auth/stores/auth.store';
// ดึง Base URL ของ API จาก Environment Variables (สำหรับ Vite)
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface DefaultErrorResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

export interface ParsedApiError {
  message: string;
  status: number;
  data: DefaultErrorResponse | null;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 60000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    'ngrok-skip-browser-warning': 'true',
  },
});

// ===== Request Interceptor =====
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore();
    const accessToken = authStore.accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      config.headers['x-csrf-token'] = accessToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// ===== Response Interceptor =====
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  async (error: AxiosError<DefaultErrorResponse>) => {
    const originalRequest = error.config as any;

    if (error.response && error.response.status === 401 && originalRequest && !originalRequest.url?.includes('/auth/refresh') && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = 'Bearer ' + token;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const authStore = useAuthStore();
        let refreshToken = authStore.refreshToken;
        if (!refreshToken) {
          refreshToken = localStorage.getItem('refreshToken');
        }

        if (refreshToken) {
          // ใช้ axios ตรง ๆ เพื่อไม่ให้ไปชนกับ interceptor ตัวเอง
          const refreshRes = await axios.post(`${baseURL}/auth/refresh`, {
            refreshToken: refreshToken
          }, { withCredentials: true });

          const newAccessToken = refreshRes.data.accessToken;
          const newRefreshToken = refreshRes.data.refreshToken;

          authStore.accessToken = newAccessToken;
          authStore.refreshToken = newRefreshToken;

          localStorage.setItem('authToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          processQueue(null, newAccessToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          // เรียก request เดิมซ้ำและ return data อย่างเดียว (เพราะ interceptor ฝั่ง success จะแกะ response.data ให้)
          // แต่อย่าลืมว่า apiClient(originalRequest) จะวิ่งไปผ่าน success interceptor ใหม่อีกรอบมั้ย?
          // คำตอบคือใช่ มันจะผ่าน request & response interceptors ใหม่
          return await apiClient(originalRequest);
        } else {
          throw new Error("No refresh token");
        }
      } catch (err) {
        processQueue(err, null);
        const { useAuthStore } = await import('@/features/auth/stores/auth.store');
        const authStore = useAuthStore();
        authStore.user = null;
        authStore.accessToken = null;
        authStore.refreshToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');

        console.error('Unauthorized! ไม่สามารถ refresh token ได้ กำลัง redirect ไปหน้า login...');
        authStore.loginRedirect();
      } finally {
        isRefreshing = false;
      }
    }

    let parsedError: ParsedApiError;

    if (error.response) {
      // Server ตอบกลับมาด้วย status code ที่ไม่ใช่ 2xx
      const { data, status } = error.response;

      // จัดการ message ที่อาจเป็น array (จาก class-validator)
      const errorMessage = Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message || error.message || 'Server Error';

      parsedError = {
        message: errorMessage,
        status: status,
        data: data,
      };

      if (status === 401) {
        console.error('Unauthorized! กำลัง redirect ไปหน้า login...');
      }
    } else if (error.request) {
      parsedError = {
        message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (Network Error)',
        status: -1,
        data: null,
      };
    } else {
      // Error อื่นๆ
      parsedError = {
        message: error.message,
        status: -2,
        data: null,
      };
    }

    return Promise.reject(parsedError);
  }
);

export default apiClient;