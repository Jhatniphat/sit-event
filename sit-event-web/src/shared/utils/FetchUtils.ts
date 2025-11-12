import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';

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
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===== Request Interceptor =====
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===== Response Interceptor =====
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error: AxiosError<DefaultErrorResponse>) => {
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