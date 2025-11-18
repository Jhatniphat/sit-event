import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import AuthCallbackLogin from '@/features/auth/views/AuthCallbackLogin.vue'
import AuthCallbackLogout from '@/features/auth/views/AuthCallbackLogout.vue'

export enum UserRole {
  ADMIN = 'admin',
  ORGANIZER = 'organizer',
  INTERNAL_STUDENT = 'internal_student',
  EXTERNAL_STUDENT = 'external_student',
}

const adminRoles = [UserRole.ADMIN, UserRole.ORGANIZER]
const userRoles = [UserRole.INTERNAL_STUDENT, UserRole.EXTERNAL_STUDENT]
const parcipantRoles = [UserRole.INTERNAL_STUDENT, UserRole.EXTERNAL_STUDENT]
const staffRoles = [UserRole.INTERNAL_STUDENT]
const allAuthenticated = [...adminRoles, ...userRoles]

const routes: Array<RouteRecordRaw> = [
  // --- Admin/Organizer Routes (Requires Admin/Organizer Role) ---
  {
    path: '/admin/events',
    name: 'OrgEventView',
    component: () => import('../features/event_management/views/OrgEventView.vue'),
    meta: {
      requiresAuth: true,
      roles: adminRoles,
    },
  },
  {
    path: '/event/create',
    name: 'createEvent',
    component: () => import('../features/event_management/components/CreateUpdate_Event.vue'),
    meta: {
      requiresAuth: true,
      roles: adminRoles,
    },
  },
  {
    path: '/event/edit/:id',
    name: 'editEvent',
    component: () => import('../features/event_management/components/CreateUpdate_Event.vue'),
    props: true,
    meta: {
      requiresAuth: true,
      roles: adminRoles,
    },
  },

  // --- Authenticated User Routes (Requires any login) ---
  {
    path: '/myregistrations',
    name: 'MyRegistration',
    component: () => import('../features/registration/views/MyRegistration.vue'),
    meta: {
      requiresAuth: true,
      roles: allAuthenticated,
    },
  },
  {
    path: '/event/:id/register',
    name: 'RegisterDetail',
    props: true,
    component: () => import('../features/registration/views/RegistrationDetail.vue'),
    meta: {
      requiresAuth: true,
      roles: allAuthenticated,
    },
  },
  // --- Staff Routes (Requires Staff Role) ---
  {
    path: '/event/:id/register/staff',
    name: 'StaffEventDetail',
    props: true,
    component: () => import('../features/registration/views/StaffingDetail.vue'),
    meta: {
      requiresAuth: true,
      roles: allAuthenticated,
    },
  },

  // --- Public Routes (No Auth Required) ---
  {
    path: '/',
    redirect: '/event/listing',
  },
  {
    path: '/event/listing',
    name: 'PartiEventView',
    component: () => import('../features/event_management/views/PartiEventView.vue'),
    meta: { requiresAuth: false }, // Public list of events [cite: 49]
  },
  {
    path: '/event/:id',
    name: 'EventDetail',
    props: true,
    component: () => import('../features/event_management/views/EventDetail.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/auth/callback/login',
    name: 'AuthCallbackLogin',
    component: AuthCallbackLogin,
    meta: { requiresAuth: false },
  },
  {
    path: '/auth/callback/logout',
    name: 'AuthCallbackLogout',
    component: AuthCallbackLogout,
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// --- Navigation Guard ---
// This function runs before every route change
router.beforeEach((to, from, next) => {
  // Get the auth store
  const authStore = useAuthStore()

  // Use getters or state from your store, e.g.:
  const isAuthenticated = authStore.isAuthenticated
  const userRole = authStore.user?.userRole as UserRole | undefined

  const requiresAuth = to.meta.requiresAuth as boolean
  const requiredRoles = to.meta.roles as UserRole[] | undefined

  // 1. Check if route requires authentication
  if (requiresAuth) {
    // 2. If user is not authenticated, redirect to Login
    if (!isAuthenticated) {
      return next({
        name: 'Login',
        query: { redirect: to.fullPath },
      })
    }

    // 3. If user is authenticated, check if they have the required role
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoleUpper = userRole?.toUpperCase()
      const requiredRolesUpper = requiredRoles.map((r) => r.toUpperCase())
      console.log('ตรวจสอบสิทธิ์:', userRoleUpper, requiredRolesUpper)
      if (userRoleUpper && requiredRolesUpper.includes(userRoleUpper)) {
        return next()
      } else {
        console.log('เด้ง')
        return next({ name: 'PartiEventView' })
      }
    }

    // 4. If auth is required but no specific roles are, proceed
    return next()
  } else {
    // 5. If no auth is required, just proceed
    return next()
  }
})

export default router
