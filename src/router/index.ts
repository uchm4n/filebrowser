import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'files',
          component: () => import('@/views/FilesView.vue'),
        },
        {
          path: 'recent',
          name: 'recent',
          component: () => import('@/views/FilesView.vue'),
          props: { collection: 'recent' },
        },
        {
          path: 'starred',
          name: 'starred',
          component: () => import('@/views/FilesView.vue'),
          props: { collection: 'starred' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated()) {
    return { name: 'login' }
  }
  if (to.meta.guestOnly && auth.isAuthenticated()) {
    return { name: 'files' }
  }
  return true
})

export default router
