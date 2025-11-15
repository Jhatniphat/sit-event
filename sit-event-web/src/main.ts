import './assets/main.css'
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router'; 

import apiClient from '@/shared/utils/FetchUtils'; 
import { useAuthStore } from '@/features/auth/stores/auth.store';

const app = createApp(App);

const pinia = createPinia(); 
app.use(pinia);
app.use(router);

apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore(pinia); 
    const token = authStore.accessToken;
    console.log('Attaching token to request:', token);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// (คุณอาจจะต้องเพิ่ม Logic สำหรับการ Refresh Token ใน interceptors.response ด้วย
// แต่นี่คือพื้นฐานสำหรับการ "ส่ง" Token ครับ)

app.mount('#app');