<template>
  <div class="container mx-auto p-6 max-w-5xl">
    <div class="flex items-center gap-3 mb-8">
      <Server class="w-8 h-8 text-primary" />
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Server Status</h1>
      <Button @click="checkAll" :disabled="isChecking" class="ml-auto" variant="outline">
        <RefreshCw :class="{'animate-spin': isChecking}" class="w-4 h-4 mr-2" />
        Refresh All
      </Button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div 
        v-for="service in services" 
        :key="service.id"
        class="bg-white dark:bg-gray-950 rounded-xl border p-6 flex flex-col shadow-sm transition-all hover:shadow-md"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div :class="[
              'p-2 rounded-lg',
              service.status === 'online' ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' :
              service.status === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' :
              'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            ]">
              <component :is="service.icon" class="w-6 h-6" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ service.title }}</h3>
              <div class="flex items-center gap-2 mt-1">
                <span class="relative flex h-2.5 w-2.5">
                  <span v-if="service.loading" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span :class="[
                    'relative inline-flex rounded-full h-2.5 w-2.5',
                    service.status === 'online' ? 'bg-green-500' :
                    service.status === 'error' ? 'bg-red-500' :
                    service.loading ? 'bg-blue-500' : 'bg-gray-300'
                  ]"></span>
                </span>
                <span class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {{ service.loading ? 'Checking...' : service.status }}
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" @click="checkService(service)" :disabled="service.loading" class="h-8 w-8 text-gray-400 hover:text-gray-700">
            <RefreshCw :class="{'animate-spin': service.loading}" class="w-4 h-4" />
          </Button>
        </div>
        
        <div class="mt-auto pt-4 border-t text-sm text-gray-600 dark:text-gray-300 break-words font-mono bg-slate-50 dark:bg-gray-900 p-3 rounded-md min-h-[4rem] flex items-center">
          {{ service.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw, onMounted } from 'vue';
import { Server, RefreshCw, Database, KeySquare, HardDrive, Cpu, Radio } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import apiClient from '@/shared/utils/FetchUtils';
import { io } from 'socket.io-client';

const isChecking = ref(false);

interface ServiceStatus {
  id: string;
  title: string;
  status: 'idle' | 'loading' | 'online' | 'error';
  message: string;
  loading: boolean;
  icon: any;
  checkFn: () => Promise<void>;
}

const services = ref<ServiceStatus[]>([
  {
    id: 'health',
    title: 'API Health',
    status: 'idle',
    message: 'Waiting to check...',
    loading: false,
    icon: markRaw(Cpu),
    checkFn: async () => {
      const s = getService('health');
      s.loading = true;
      try {
        const res: any = await apiClient.get('/health');
        s.status = 'online';
        s.message = res.message || 'API is running normally';
      } catch (err: any) {
        s.status = 'error';
        s.message = err?.message || 'Failed to connect to API';
      } finally {
        s.loading = false;
      }
    }
  },
  {
    id: 'prisma',
    title: 'Database (Prisma)',
    status: 'idle',
    message: 'Waiting to check...',
    loading: false,
    icon: markRaw(Database),
    checkFn: async () => {
      const s = getService('prisma');
      s.loading = true;
      try {
        const res: any = await apiClient.get('/prisma-status');
        const resStatus = String(res.status).toLowerCase();
        if (resStatus === 'error' || resStatus === 'false') {
          s.status = 'error';
        } else {
          s.status = 'online';
        }
        s.message = res.message || 'Database connected';
      } catch (err: any) {
        s.status = 'error';
        s.message = err?.message || 'Database connection error';
      } finally {
        s.loading = false;
      }
    }
  },
  {
    id: 'redis',
    title: 'Redis Cache',
    status: 'idle',
    message: 'Waiting to check...',
    loading: false,
    icon: markRaw(HardDrive),
    checkFn: async () => {
      const s = getService('redis');
      s.loading = true;
      try {
        const res: any = await apiClient.get('/status/redis');
        const resStatus = String(res.status).toLowerCase();
        if (resStatus === 'error' || resStatus === 'false') {
          s.status = 'error';
        } else {
          s.status = 'online';
        }
        s.message = res.message || 'Redis connected';
      } catch (err: any) {
        s.status = 'error';
        s.message = err?.message || 'Redis connection error';
      } finally {
        s.loading = false;
      }
    }
  },
  {
    id: 'keycloak',
    title: 'Authen (Keycloak)',
    status: 'idle',
    message: 'Waiting to check...',
    loading: false,
    icon: markRaw(KeySquare),
    checkFn: async () => {
      const s = getService('keycloak');
      s.loading = true;
      try {
        const res: any = await apiClient.get('/status/keycloak');
        const resStatus = String(res.status).toLowerCase();
        if (resStatus === 'error' || resStatus === 'false') {
          s.status = 'error';
        } else {
          s.status = 'online';
        }
        s.message = res.message || 'Keycloak connected';
      } catch (err: any) {
        s.status = 'error';
        s.message = err?.message || 'Keycloak connection error';
      } finally {
        s.loading = false;
      }
    }
  },
  {
    id: 'minio',
    title: 'Storage (MinIO)',
    status: 'idle',
    message: 'Waiting to check...',
    loading: false,
    icon: markRaw(HardDrive),
    checkFn: async () => {
      const s = getService('minio');
      s.loading = true;
      try {
        const res: any = await apiClient.get('/minio/status');
        const resStatus = String(res.status).toLowerCase();
        if (resStatus === 'error' || resStatus === 'false') {
          s.status = 'error';
        } else {
          s.status = 'online';
        }
        s.message = res.message || 'MinIO connected';
      } catch (err: any) {
        s.status = 'error';
        s.message = err?.message || 'MinIO connection error';
      } finally {
        s.loading = false;
      }
    }
  },
  {
    id: 'websocket',
    title: 'WebSocket (Socket.io)',
    status: 'idle',
    message: 'Waiting to check...',
    loading: false,
    icon: markRaw(Radio),
    checkFn: async () => {
      const s = getService('websocket');
      s.loading = true;
      s.message = 'Connecting...';
      
      return new Promise<void>((resolve) => {
        const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        // Socket.io connection attempt
        const socket = io(baseURL, {
          reconnectionAttempts: 1,
          timeout: 5000,
        });

        socket.on('connect', () => {
          s.status = 'online';
          s.message = `Connected via transport: ${socket.io.engine.transport.name}`;
          socket.disconnect();
          s.loading = false;
          resolve();
        });

        socket.on('connect_error', (err) => {
          s.status = 'error';
          s.message = err.message || 'WebSocket connection failed';
          socket.disconnect();
          s.loading = false;
          resolve();
        });
      });
    }
  }
]);

const getService = (id: string) => services.value.find(s => s.id === id)!;

const checkService = async (service: ServiceStatus) => {
  await service.checkFn();
};

const checkAll = async () => {
  isChecking.value = true;
  await Promise.all(services.value.map(s => s.checkFn()));
  isChecking.value = false;
};

onMounted(() => {
  checkAll();
});
</script>
