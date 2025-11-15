import { createRouter, createWebHistory } from 'vue-router'
import AuthCallback from '@/features/auth/views/AuthCallback.vue' // หน้าที่จะรับ Code

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'OrgEventView',
      component: () => import('../features/event_management/views/OrgEventView.vue'),
    },
    {
      path: '/event/create',
      name: 'createEvent',
      component: () => import('../features/event_management/components/CreateUpdate_Event.vue'),
    },
    {
      path: '/event/edit/:id',
      name: 'editEvent',
      component: () => import('../features/event_management/components/CreateUpdate_Event.vue'),
      props: true,
    },
    {
      path: '/event/listing',
      name: 'PartiEventView',
      component: () => import('../features/event_management/views/PartiEventView.vue'),
      props: true,
    },
    {
      path: '/auth/callback', // <--- นี่คือหน้า Callback ที่ตรงกับ redirect_uri
      name: 'AuthCallback',
      component: AuthCallback,
    },
    {
      path: '/event/:id',
      name: 'EventDetail',
      props: true,
      component: () => import('../features/event_management/views/EventDetail.vue'),
    },
    {
      path: '/event/:id/register',
      name: 'RegisterDetail',
      props: true,
      component: () => import('../features/registration/views/RegistrationDetail.vue'),
    },
    {
      path: '/myregistrations',
      name: 'MyRegistration',
      component: () => import('../features/registration/views/MyRegistration.vue'),
    },
  ],
})

export default router
