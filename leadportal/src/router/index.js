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
import AdminFAQView from '../views/AdminFAQView.vue'
import AdminAboutView from '../views/AdminAboutView.vue'
import AdminDesignSettingsView from '../views/AdminDesignSettingsView.vue'
import AdminEmailSMSSettingsView from '../views/AdminEmailSMSSettingsView.vue'
import AdminLeadTypePermissionsView from '../views/AdminLeadTypePermissionsView.vue'
import ProfileView from '../views/ProfileView.vue'
import LeadMarketplaceView from '../views/LeadMarketplaceView.vue'
import AdminHomepageSettingsView from '../views/AdminHomepageSettingsView.vue'
import AdminStatisticsView from '../views/AdminStatisticsView.vue'
import AdminActivityLogView from '../views/AdminActivityLogView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import ResetPasswordView from '../views/ResetPasswordView.vue'
import UserDashboardView from '../views/UserDashboardView.vue'

export const appRoutes = [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/leads',
      name: 'lead-marketplace',
      component: LeadMarketplaceView,
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordView,
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: ResetPasswordView,
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
      path: '/admin/users',
      name: 'admin-users',
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
      path: '/dashboard',
      name: 'user-dashboard',
      component: UserDashboardView,
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
    {
      path: '/admin/faq',
      name: 'admin-faq',
      component: AdminFAQView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/about',
      name: 'admin-about',
      component: AdminAboutView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/design-settings',
      name: 'admin-design-settings',
      component: AdminDesignSettingsView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/email-sms-settings',
      name: 'admin-email-sms-settings',
      component: AdminEmailSMSSettingsView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/lead-type-permissions',
      name: 'admin-lead-type-permissions',
      component: AdminLeadTypePermissionsView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/homepage-settings',
      name: 'admin-homepage-settings',
      component: AdminHomepageSettingsView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/statistics',
      name: 'admin-statistics',
      component: AdminStatisticsView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/activity-log',
      name: 'admin-activity-log',
      component: AdminActivityLogView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
    },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: appRoutes,
  scrollBehavior(to, from, savedPosition) {
    // Her sayfa değişikliğinde sayfanın en üstüne git
    return { top: 0 }
  }
})

// Global guard: Kullanıcı tipi yetkilendirme kontrolü
router.beforeEach(async (to, from, next) => {
  console.log(`Router guard: navigating to ${to.path}`)
  
  try {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
    const userTypeId = typeof window !== 'undefined' ? window.localStorage.getItem('userTypeId') : null
    
    console.log('Permission check - token:', !!token, 'userTypeId:', userTypeId, 'path:', to.path)
    
    // Login, şifre sıfırlama ve forbidden sayfalarına herkes erişebilir
    if (to.path === '/forbidden' || to.path === '/login' || to.path === '/forgot-password' || to.path === '/reset-password') {
      console.log('Allowing access to:', to.path)
      next()
      return
    }
    
    // Token yoksa login'e yönlendir
    if (!token) {
      console.log('No token - redirecting to login')
      next({ name: 'login' })
      return
    }
    
    // userTypeId yoksa erişim engelle
    if (!userTypeId) {
      console.log('No userTypeId - blocking access to:', to.path)
      next({ name: 'forbidden' })
      return
    }
    
    // Admin sayfaları için özel kontrol
    if (to.matched.some(r => r.meta && r.meta.requiresAdmin)) {
      // SUPERADMIN ve ADMIN tipleri admin sayfalarına erişebilir
      if (userTypeId === 'SUPERADMIN' || userTypeId === 'ADMIN') {
        console.log('Admin user - allowing access to:', to.path)
        next()
        return
      } else {
        console.log('Admin access denied, redirecting to forbidden')
        next({ name: 'forbidden' })
        return
      }
    }
    
    // Diğer sayfalar için API kontrolü
    try {
      const response = await fetch(`/api/user-types/check/${userTypeId}?route=${encodeURIComponent(to.path.slice(1))}`, {
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
    
    console.log('Router guard: allowing access to', to.path)
    next()
  } catch (error) {
    console.error('Permission check error:', error)
    console.log('Error fallback - redirecting to login')
    next({ name: 'login' })
  }
})

export default router
