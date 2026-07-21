import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
      },
      {
        path: 'api-keys',
        name: 'ApiKeys',
        component: () => import('@/views/ApiKeys.vue'),
      },
      {
        path: 'api-keys/:id',
        name: 'ApiKeyDetail',
        component: () => import('@/views/ApiKeyDetail.vue'),
      },
      {
        path: 'quota',
        name: 'QuotaBoard',
        component: () => import('@/views/QuotaBoard.vue'),
      },
      {
        path: 'quota/:id',
        name: 'QuotaDetail',
        component: () => import('@/views/QuotaDetail.vue'),
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
