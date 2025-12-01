<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/stores/auth.store'; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
// เพิ่ม import icons สำหรับ Mobile Menu (Menu, X)
import { ChevronDown, LayoutDashboard, Calendar, User, LogOut, Globe, Menu, X } from 'lucide-vue-next';

const authStore = useAuthStore();
const router = useRouter();
const isMobileMenuOpen = ref(false); // State สำหรับเปิด/ปิดเมนูมือถือ

// --- Computed ---
const isAdminOrOrganizer = computed(() => {
  const role = authStore.user?.userRole;
  return role === 'Organizer' || role === 'Admin' || role === 'ADMIN' || role === 'ORGANIZER';
});

const userInitials = computed(() => {
  if (!authStore.user) return 'UE';
  return `${authStore.user.firstName.charAt(0)}${authStore.user.lastName.charAt(0)}`.toUpperCase();
});

// --- Actions ---
const handleLogin = () => authStore.loginRedirect();
const handleLogout = () => authStore.logoutRedirect();

const navigateTo = (path: string) => {
  router.push(path);
  isMobileMenuOpen.value = false; // ปิดเมนูเมื่อเปลี่ยนหน้า
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const isAuthenticated = computed(() => authStore.isAuthenticated);
</script>

<template>
  <nav class="border-b bg-white dark:bg-gray-950 shadow-sm relative z-50">
    <div class="container mx-auto px-4 py-3">
      <div class="flex items-center justify-between">
        
        <div class="flex items-center gap-6">
          <a 
            href="#" 
            @click.prevent="navigateTo('/')" 
            class="text-xl font-bold text-primary hover:opacity-80 transition-opacity"
          >
            SIT Event
          </a>

          <div class="hidden md:flex items-center gap-4 text-gray-800">
            <Button v-if="isAuthenticated && !isAdminOrOrganizer"
              variant="ghost" 
              @click="navigateTo('/myactivities')"
              class="text-sm font-medium"
            >
              My Booking
            </Button>

            <DropdownMenu v-if="isAdminOrOrganizer">
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" class="flex items-center gap-1">
                  My Admin
                  <ChevronDown class="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem @click="navigateTo('/admin/dashboard')">
                  <LayoutDashboard class="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem @click="navigateTo('/admin/events')">
                  <Calendar class="mr-2 h-4 w-4" />
                  <span>Events</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div class="flex items-center gap-2">
          
          <div v-if="authStore.isAuthenticated" class="flex items-center text-gray-800">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" class="flex items-center gap-2 px-2 hover:bg-slate-100 rounded-full h-auto py-1">
                  <div class="text-right hidden sm:block">
                    <p class="text-sm font-medium leading-none">{{ authStore.user?.firstName }} {{ authStore.user?.lastName }}</p>
                    <p class="text-xs text-muted-foreground">{{ authStore.user?.userRole }}</p>
                  </div>
                  <Avatar class="h-8 w-8 sm:h-9 sm:w-9 border">
                    <AvatarImage src="" alt="User Avatar" />
                    <AvatarFallback>{{ userInitials }}</AvatarFallback>
                  </Avatar>
                  <ChevronDown class="h-4 w-4 opacity-50 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" class="w-56">
                <DropdownMenuLabel class="sm:hidden">
                  {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
                </DropdownMenuLabel>
                <DropdownMenuSeparator class="sm:hidden" />
                <DropdownMenuItem @click="navigateTo('/profile/edit')">
                  <User class="mr-2 h-4 w-4" />
                  <span>Edit Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Globe class="mr-2 h-4 w-4" />
                  <span>English</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="handleLogout" class="text-red-600 focus:text-red-600">
                  <LogOut class="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div v-else class="hidden md:block">
            <Button @click="handleLogin">Login</Button>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            class="md:hidden ml-1" 
            @click="toggleMobileMenu"
          >
            <X v-if="isMobileMenuOpen" class="h-5 w-5" />
            <Menu v-else class="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div v-if="isMobileMenuOpen" class="md:hidden mt-3 border-t pt-4 space-y-3 pb-2 animate-in slide-in-from-top-2 duration-200">
        <div v-if="!authStore.isAuthenticated" class="px-2">
           <Button class="w-full" @click="handleLogin">Login</Button>
        </div>

        <Button v-if="isAuthenticated && !isAdminOrOrganizer"
          variant="ghost" 
          class="w-full justify-start text-base" 
          @click="navigateTo('/myactivities')"
        >
          My Booking
        </Button>

        <div v-if="isAdminOrOrganizer" class="space-y-1 pt-2 border-t mt-2">
          <p class="px-4 text-xs font-semibold text-muted-foreground uppercase mb-2">My Admin</p>
          <Button 
            variant="ghost" 
            class="w-full justify-start pl-8" 
            @click="navigateTo('/admin/dashboard')"
          >
            <LayoutDashboard class="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button 
            variant="ghost" 
            class="w-full justify-start pl-8" 
            @click="navigateTo('/admin/events')"
          >
            <Calendar class="mr-2 h-4 w-4" />
            Events
          </Button>
        </div>
      </div>
    </div>
  </nav>
</template>