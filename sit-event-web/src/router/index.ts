import { createRouter, createWebHistory } from 'vue-router'
// import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // {
    //   path: '/',
    //   name: 'home',
    //   component: HomeView,
    // },
    // {
    //   path: '/about',
    //   name: 'about',
    //   // route level code-splitting
    //   // this generates a separate chunk (About.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () => import('../views/AboutView.vue'),
    // },
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
  ],
})

export default router
