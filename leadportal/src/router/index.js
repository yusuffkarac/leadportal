import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LeadDetailView from '../views/LeadDetailView.vue'
import LoginView from '../views/LoginView.vue'
import AdminLeadsListView from '../views/AdminLeadsListView.vue'
import AdminLeadEditView from '../views/AdminLeadEditView.vue'
import AdminUserNewView from '../views/AdminUserNewView.vue'
import AdminLeadNewView from '../views/AdminLeadNewView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/admin/leads/new',
      name: 'admin-leads-new',
      component: AdminLeadNewView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/admin/leads',
      name: 'admin-leads',
      component: AdminLeadsListView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/leads/new',
      name: 'admin-leads-new',
      component: () => import('../views/AdminLeadNewView.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/users/new',
      name: 'admin-users-new',
      component: AdminUserNewView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/leads/:id',
      name: 'admin-leads-edit',
      component: AdminLeadEditView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/lead/:id',
      name: 'lead-detail',
      component: LeadDetailView,
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: () => import('../views/ForbiddenView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

// Global guard: Admin sayfalarina sadece ADMIN rolunde kullanici erisebilir
router.beforeEach((to, from, next) => {
  if (to.matched.some(r => r.meta && r.meta.requiresAdmin)) {
    try {
      const role = typeof window !== 'undefined' ? window.localStorage.getItem('role') : null
      if (role !== 'ADMIN') {
        next({ name: 'forbidden' })
        return
      }
    } catch (e) {
      next({ name: 'forbidden' })
      return
    }
  }
  next()
})

export default router
