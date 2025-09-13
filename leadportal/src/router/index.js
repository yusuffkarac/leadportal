import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LeadDetailView from '../views/LeadDetailView.vue'
import LoginView from '../views/LoginView.vue'
import AdminLeadsListView from '../views/AdminLeadsListView.vue'
import AdminLeadEditView from '../views/AdminLeadEditView.vue'
import AdminUserNewView from '../views/AdminUserNewView.vue'
import AdminLeadNewView from '../views/AdminLeadNewView.vue'
import FAQView from '../views/FAQView.vue'
import PurchasedLeadsView from '../views/PurchasedLeadsView.vue'
import AdminSettingsView from '../views/AdminSettingsView.vue'
import AdminUserTypesView from '../views/AdminUserTypesView.vue'

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
    {
      path: '/faq',
      name: 'faq',
      component: FAQView,
    },
    {
      path: '/purchased-leads',
      name: 'purchased-leads',
      component: PurchasedLeadsView,
    },
    {
      path: '/admin/settings',
      name: 'admin-settings',
      component: AdminSettingsView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/user-types',
      name: 'admin-user-types',
      component: AdminUserTypesView,
      meta: { requiresAdmin: true },
    },
  ],
})

// Global guard: Admin sayfalarina sadece ADMIN rolunde kullanici erisebilir
router.beforeEach(async (to, from, next) => {
  console.log(`Router guard: navigating to ${to.path}`)
  
  // Admin kontrolü
  if (to.matched.some(r => r.meta && r.meta.requiresAdmin)) {
    try {
      const role = typeof window !== 'undefined' ? window.localStorage.getItem('role') : null
      console.log('Admin check - role:', role)
      if (role !== 'ADMIN') {
        console.log('Admin access denied, redirecting to forbidden')
        next({ name: 'forbidden' })
        return
      }
    } catch (e) {
      console.log('Admin check error, redirecting to forbidden')
      next({ name: 'forbidden' })
      return
    }
  }

  // Kullanıcı tipi yetkilendirme kontrolü
  try {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
    const role = typeof window !== 'undefined' ? window.localStorage.getItem('role') : null
    const userTypeId = typeof window !== 'undefined' ? window.localStorage.getItem('userTypeId') : null
    
    console.log('Permission check - token:', !!token, 'role:', role, 'userTypeId:', userTypeId, 'path:', to.path)
    
    // ADMIN rolü her sayfaya erişebilir
    if (role === 'ADMIN') {
      console.log('Admin user - allowing access to:', to.path)
      next()
      return
    }
    
    // USER rolü için yetkilendirme kontrolü
    if (token && role === 'USER') {
      // Forbidden ve login sayfalarına herkes erişebilir
      if (to.path === '/forbidden' || to.path === '/login') {
        console.log('Allowing access to:', to.path)
        next()
        return
      }
      
      // userTypeId yoksa sadece ana sayfa izni
      if (!userTypeId && to.path !== '/') {
        console.log('No userTypeId - blocking access to:', to.path)
        next({ name: 'forbidden' })
        return
      }
      
      // userTypeId varsa API kontrolü
      if (userTypeId) {
        try {
          const response = await fetch(`/api/user-types/check/${userTypeId}${to.path}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            if (!data.hasAccess) {
              console.log('API permission denied for:', to.path)
              next({ name: 'forbidden' })
              return
            }
          } else {
            console.log('API check failed - blocking access to:', to.path)
            next({ name: 'forbidden' })
            return
          }
        } catch (apiError) {
          console.error('API permission check error:', apiError)
          console.log('API error - blocking access to:', to.path)
          next({ name: 'forbidden' })
          return
        }
      }
    } else if (token && !role) {
      console.log('Token exists but no role found')
    }
  } catch (error) {
    console.error('Permission check error:', error)
    // Hata durumunda güvenlik için erişimi engelle
    const role = typeof window !== 'undefined' ? window.localStorage.getItem('role') : null
    if (role !== 'ADMIN' && to.path !== '/forbidden' && to.path !== '/login') {
      console.log('Error fallback - blocking access to:', to.path)
      next({ name: 'forbidden' })
      return
    }
  }

  console.log('Router guard: allowing access to', to.path)
  next()
})

export default router
