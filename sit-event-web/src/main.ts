import './assets/main.css'
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router'; 
import Particles from "@tsparticles/vue3";

import apiClient from '@/shared/utils/FetchUtils'; 
import { useAuthStore } from '@/features/auth/stores/auth.store';

const app = createApp(App);

const pinia = createPinia(); 
app.use(pinia);
app.use(router);
app.use(Particles, {
  init: async (engine: any) => {
    // dynamically import slim package to initialize
    const { loadSlim } = await import("@tsparticles/slim");
    await loadSlim(engine);
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore(pinia); 
    const token = authStore.accessToken;
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