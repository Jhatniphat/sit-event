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
      name: 'eventView',
      component: () => import('../features/event_management/views/EventView.vue'),
    },
    {
      path: '/event/create',
      name: 'createEvent',
      component: () => import('../features/event_management/components/CreateUpdate_Event.vue'),
    },
  ],
})

export default router
