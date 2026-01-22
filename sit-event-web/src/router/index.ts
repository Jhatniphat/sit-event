import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import AuthCallbackLogin from '@/features/auth/views/AuthCallbackLogin.vue'
import AuthCallbackLogout from '@/features/auth/views/AuthCallbackLogout.vue'
import NotFoundView from '@/shared/views/NotFoundView.vue'

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
    path: '/admin/events/create',
    name: 'CreateEvent',
    component: () => import('../features/event_management/components/CreateUpdate_Event.vue'),
    meta: {
      requiresAuth: true,
      roles: adminRoles,
    },
  },
  {
    path: '/admin/events/edit/:id',
    name: 'EditEvent',
    component: () => import('../features/event_management/components/CreateUpdate_Event.vue'),
    props: true,
    meta: {
      requiresAuth: true,
      roles: adminRoles,
    },
  },
  {
    path: '/admin/events/:id/forms',
    name: 'FormsList',
    component: () => import('../features/forms/views/FormManagementView.vue'),
    props: true,
    meta: {
      requiresAuth: true,
      roles: adminRoles,
    },
  },
  {
    path: '/admin/events/:id/forms/:formId',
    name: 'CreateForms',
    component: () => import('../features/forms/views/CreateFormsView.vue'),
    props: true,
    meta: {
      requiresAuth: true,
      roles: adminRoles,
    },
  },

  // --- Authenticated User Routes (Requires any login) ---
  {
    path: '/myactivities',
    name: 'MyActivities',
    component: () => import('../features/registration/views/MyRegistration.vue'),
    meta: {
      requiresAuth: true,
      roles: allAuthenticated,
    },
  },
  {
    path: '/events/:id/register/qrcode',
    name: 'ShowQRCode',
    props: true,
    component: () => import('../features/registration/views/RegistrationQRCode.vue'),
    meta: {
      requiresAuth: true,
      roles: allAuthenticated,
    },
  },
  {
    path: '/events/:id/register',
    name: 'RegisterDetail',
    props: true,
    component: () => import('../features/registration/views/RegistrationDetail.vue'),
    meta: {
      requiresAuth: true,
      roles: allAuthenticated,
    },
  },
  // * --- Staff Routes (Requires Staff Role) ---
  {
    path: '/events/:id/register/staff',
    name: 'StaffEventDetail',
    props: true,
    component: () => import('../features/registration/views/StaffingDetail.vue'),
    meta: {
      requiresAuth: true,
      roles: allAuthenticated,
    },
  },
  {
    path: '/events/:id/register/scan-qrcode',
    name: 'ScanQRCode',
    props: true,
    component: () => import('../features/registration/views/ScanQRCode.vue'),
    meta: {
      requiresAuth: true,
      roles: allAuthenticated,
    },
  },

  // * --- Public Routes (No Auth Required) ---
  {
    path: '/',
    redirect: '/events/listing',
    name: 'Home',
    meta: { requiresAuth: false },
  },
  {
    path: '/events/listing',
    name: 'PartiEventView',
    component: () => import('../features/event_management/views/PartiEventView.vue'),
    meta: { requiresAuth: false }, // Public list of events [cite: 49]
  },
  {
    path: '/events/detail/:id',
    name: 'EventDetail',
    props: true,
    component: () => import('../features/event_management/views/EventDetail.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/events/:id/forms',
    name: 'FormView',
    component: () => import('../features/forms/views/FormView.vue'),
    props: true,
    meta: { requiresAuth: false },
  },

  // * --- Auth Callback Routes (No Auth Required) ---
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

  // * --- 404 Not Found Route ---
  {
    path: '/:pathMatch(.*)*', // Regex นี้จะจับทุก path ที่ไม่ตรงกับข้างบน
    name: 'NotFound',
    component: NotFoundView,
    meta: { requiresAuth: false }, // ไม่ต้อง login ก็เจอหน้านี้ได้
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
    if (!authStore.isAuthenticated) {
      authStore.loginRedirect()
      return
    }

    // 3. If user is authenticated, check if they have the required role
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoleUpper = userRole?.toUpperCase()
      const requiredRolesUpper = requiredRoles.map((r) => r.toUpperCase())
      if (userRoleUpper && requiredRolesUpper.includes(userRoleUpper)) {
        return next()
      } else {
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
