<script setup>
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import HelloWorld from './components/HelloWorld.vue'
import UserProfile from './components/UserProfile.vue'
import GlobalAlert from './components/GlobalAlert.vue'
import NotificationDropdown from './components/NotificationDropdown.vue'
import LeadSearchModal from './components/LeadSearchModal.vue'
import ScrollToTop from './components/ScrollToTop.vue'
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { checkPageAccess } from './utils/permissions.js'
import defaultLogo from '@/assets/images/logo.png'
import api from '@/utils/axios.js'
import { Icon } from '@iconify/vue'
import { useActivityMonitor } from './composables/useActivityMonitor.js'
import { useSessionTimeout } from './composables/useSessionTimeout.js'

const router = useRouter()
const route = useRoute()

function logout() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // LocalStorage ve sessionStorage'ı temizle
      window.localStorage.removeItem('token')
      window.localStorage.removeItem('userId')
      window.localStorage.removeItem('role')
      window.localStorage.removeItem('userType')
      window.localStorage.removeItem('userTypeId')
      window.sessionStorage.removeItem('token')
      window.sessionStorage.removeItem('userId')
      window.sessionStorage.removeItem('role')
      window.sessionStorage.removeItem('userType')
      window.sessionStorage.removeItem('userTypeId')
      
      // State'i sıfırla
      isAuthed.value = false
      role.value = null
      userType.value = null
      userTypeId.value = null
      pagePermissions.value = {}
      
      // Ana sayfaya yönlendir
      router.push('/')
      
      // Auth değişikliğini bildir
      window.dispatchEvent(new Event('auth-change'))
    }
  } catch (e) {
    // ignore
  }
}

function goToHome() {
  router.push('/')
}

const isAuthed = ref(false)
const role = ref(null)
const userType = ref(null)
const userTypeId = ref(null)
const pagePermissions = ref({})
const currentUser = ref({})

// Branding
const companyName = ref('LeadPortal')
const companyLogoUrl = ref('')
const footerPhone = ref('+90 (212) 123 45 67')
const footerEmail = ref('info@leadportal.com')
const footerNote = ref('')
const footerDescription = ref('Deutschlands führende Lead-Marktplatz. Professionelle Auktionen und Lead-Management-Plattform.')
const tradeRegisterNumber = ref('Handelsregister-Nr.: 12345')
const servicesLinks = ref([])
const supportLinks = ref([])
const legalLinks = ref([])
const socialMedia = ref({ facebook: '', twitter: '', linkedin: '', instagram: '' })

async function loadBranding() {
  try {
    const CACHE_KEY = 'branding_cache'
    const CACHE_TIMESTAMP_KEY = 'branding_cache_timestamp'
    const CACHE_DURATION = 2 * 60 * 60 * 1000 // 2 saat (milliseconds)

    
    // Cache'den kontrol et
    const cachedData = localStorage.getItem(CACHE_KEY)
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    const now = Date.now()
    
    // Cache geçerliyse (3 günden yeni) cache'den kullan
    if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp)) < CACHE_DURATION) {
      const settings = JSON.parse(cachedData)
      applyBrandingSettings(settings)
      return
    }
    
    // Cache yoksa veya eskiyse API'den çek
    const response = await api.get('/settings/branding')
    const settings = response.data
    
    if (settings) {
      // Cache'e kaydet
      localStorage.setItem(CACHE_KEY, JSON.stringify(settings))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString())
      
      applyBrandingSettings(settings)
    }
  } catch (error) {
    console.error('Branding yükleme hatası:', error)
    // Fallback to cache if available
    const cachedData = localStorage.getItem('branding_cache')
    if (cachedData) {
      try {
        const settings = JSON.parse(cachedData)
        applyBrandingSettings(settings)
        return
      } catch {}
    }
    
    // Fallback to default values
    companyName.value = 'LeadPortal'
    footerPhone.value = '+90 (212) 123 45 67'
    footerEmail.value = 'info@leadportal.com'
    footerDescription.value = 'Deutschlands führende Lead-Marktplatz. Professionelle Auktionen und Lead-Management-Plattform.'
    tradeRegisterNumber.value = 'Handelsregister-Nr.: 12345'
  }
}

function applyBrandingSettings(settings) {
  companyName.value = settings.companyName || 'LeadPortal'
  companyLogoUrl.value = settings.companyLogoUrl || ''
  footerPhone.value = settings.footerPhone || '+90 (212) 123 45 67'
  footerEmail.value = settings.footerEmail || 'info@leadportal.com'
  footerNote.value = settings.footerNote || ''
  footerDescription.value = settings.footerDescription || 'Deutschlands führende Lead-Marktplatz. Professionelle Auktionen und Lead-Management-Plattform.'
  tradeRegisterNumber.value = settings.tradeRegisterNumber || 'Handelsregister-Nr.: 12345'
  
  // Load links
  servicesLinks.value = settings.servicesLinks || [
    { text: 'Live-Auktion', url: '#' },
    { text: 'Bevorstehende Auktionen', url: '#' },
    { text: 'Sofortkauf', url: '#' },
    { text: 'Dashboard', url: '#' },
    { text: 'Lead-Management', url: '#' }
  ]
  
  supportLinks.value = settings.supportLinks || [
    { text: 'FAQ', url: '#' },
    { text: 'Kontakt', url: '#' },
    { text: 'Hilfezentrum', url: '#' },
    { text: 'Systemstatus', url: '#' }
  ]
  
  legalLinks.value = settings.legalLinks || [
    { text: 'Impressum', url: '#' },
    { text: 'Datenschutzerklärung', url: '#' },
    { text: 'AGB', url: '#' },
    { text: 'Widerrufsrecht', url: '#' },
    { text: 'Cookie-Richtlinie', url: '#' }
  ]
  
  // Load social media
  socialMedia.value = settings.socialMedia || { facebook: '', twitter: '', linkedin: '', instagram: '' }
  
  // Update favicon
  if (settings.faviconUrl) {
    updateFavicon(settings.faviconUrl)
  }
}

function updateFavicon(url) {
  if (!url) return
  
  try {
    // Tüm favicon linklerini temizle
    const existingLinks = document.querySelectorAll("link[rel*='icon']")
    existingLinks.forEach(link => link.remove())
    
    // Yeni favicon linki oluştur
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    link.href = url
    link.setAttribute('data-dynamic', 'true')
    
    // Cache busting için timestamp ekle (sadece normal URL'ler için)
    if (!url.includes('?') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      link.href += '?v=' + Date.now()
    }
    
    // Head'e ekle
    document.getElementsByTagName('head')[0].appendChild(link)
    
  } catch (error) {
    console.error('Favicon güncellenirken hata:', error)
  }
}

// Tasarım ayarları
async function loadDesignSettings() {
  try {
    const response = await api.get('/settings/design')
    if (response.data && response.data.colors) {
      applyDesignSettings(response.data.colors)
    }
  } catch (error) {
    console.error('Tasarım ayarları yüklenemedi:', error)
    // Varsayılan ayarları uygula
    applyDesignSettings({
      bg: '#f8fafc',
      panel: '#ffffff',
      muted: '#64748b',
      text: '#1e293b',
      primary: '#1e293b',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      border: '#e2e8f0'
    })
  }
}

function applyDesignSettings(colors) {
  const root = document.documentElement
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })
}

const isAdminRoute = computed(() => route.matched.some(record => record.meta && record.meta.requiresAdmin))

// Admin menu style - localStorage'dan yükle
const adminMenuStyle = ref(localStorage.getItem('adminMenuStyle') === 'sidebar')

// Admin menu style değişikliğini dinle
function onAdminMenuStyleChange() {
  adminMenuStyle.value = localStorage.getItem('adminMenuStyle') === 'sidebar'
}

// Sayfa yetkilendirmelerini kontrol et
const canAccessAbout = computed(() => {
  return pagePermissions.value['/about'] !== false
})

const canAccessFAQ = computed(() => {
  return pagePermissions.value['/faq'] !== false
})

const canAccessPurchased = computed(() => {
  return pagePermissions.value['/purchased-leads'] !== false
})

async function updateAuth() {
  if (typeof window === 'undefined') return
  const storage = window.sessionStorage.getItem('token') ? window.sessionStorage : window.localStorage
  isAuthed.value = !!storage.getItem('token')
  role.value = storage.getItem('role') || null
  userTypeId.value = storage.getItem('userTypeId') || null
  
  // userType bilgisini parse et
  try {
    const userTypeStr = storage.getItem('userType')
    userType.value = userTypeStr ? JSON.parse(userTypeStr) : null
  } catch (e) {
    userType.value = null
  }
  
  // Kullanıcı bilgilerini yükle
  if (isAuthed.value) {
    try {
      const response = await api.get('/auth/profile')
      currentUser.value = response.data.user
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenemedi:', error)
    }
  } else {
    currentUser.value = {}
  }
  
  // Sayfa yetkilendirmelerini yükle
  if (isAuthed.value && userTypeId.value && userTypeId.value !== 'SUPERADMIN') {
    try {
      const pages = ['/about', '/faq', '/purchased-leads']
      const permissions = {}
      
      for (const page of pages) {
        permissions[page] = await checkPageAccess(page)
      }
      
      pagePermissions.value = permissions
    } catch (error) {
      console.error('Error loading page permissions:', error)
    }
  } else {
    pagePermissions.value = {}
  }
}

function onAuthChange() { updateAuth() }

let navToken = 0
let hideTimer = null

// Activity monitoring and session timeout
let activityMonitor = null
let sessionTimeout = null

onMounted(() => {
  updateAuth()
  loadBranding()
  loadDesignSettings()

  // Composable'ları başlat
  const storage = window.sessionStorage.getItem('token') ? window.sessionStorage : window.localStorage
  if (storage.getItem('token')) {
    // Kullanıcı logged in ise monitoring başlat
    activityMonitor = useActivityMonitor()
    sessionTimeout = useSessionTimeout()
  }

  window.addEventListener('auth-change', onAuthChange)
  window.addEventListener('settings-change', loadBranding)
  window.addEventListener('design-settings-change', loadDesignSettings)
  window.addEventListener('user-logout', logout)
  window.addEventListener('admin-menu-style-change', onAdminMenuStyleChange)
  router.beforeEach((to, from, next) => {
    navToken++
    isNavigating.value = true
    next()
  })
  router.afterEach(() => {
    const myToken = navToken
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      if (myToken === navToken) {
        isNavigating.value = false
      }
    }, 450)
  })
})

onUnmounted(() => {
  // Composable'ları durdur
  if (activityMonitor && activityMonitor.stopMonitoring) {
    activityMonitor.stopMonitoring()
  }
  if (sessionTimeout && sessionTimeout.stopSessionTimeoutCheck) {
    sessionTimeout.stopSessionTimeoutCheck()
  }

  window.removeEventListener('auth-change', onAuthChange)
  window.removeEventListener('settings-change', loadBranding)
  window.removeEventListener('design-settings-change', loadDesignSettings)
  window.removeEventListener('user-logout', logout)
  window.removeEventListener('admin-menu-style-change', onAdminMenuStyleChange)
})

const isNavigating = ref(false)
const isMobileMenuOpen = ref(false)
const isAdminDropdownOpen = ref(false)
const isLeadsDropdownOpen = ref(false)
const showSearchModal = ref(false)

// Multi-level admin menu states
const activeAdminCategory = ref(null)

// Mobile admin category states
const mobileAdminCategoryStates = ref({
  management: false,
  settings: false,
  permissions: false,
  content: false
})

// Mobile user profile dropdown state
const isMobileUserProfileOpen = ref(false)

async function toggleMobileAdminCategory(category) {
  const wasOpen = mobileAdminCategoryStates.value[category]
  mobileAdminCategoryStates.value[category] = !mobileAdminCategoryStates.value[category]
  
  // Eğer kategori açıldıysa (önceden kapalıydı ve şimdi açıldı), scroll yap
  if (!wasOpen && mobileAdminCategoryStates.value[category]) {
    await nextTick()
    
    // Kategori header'ını bul
    const categoryHeader = document.querySelector(`[data-category="${category}"]`)
    const menuContent = document.querySelector('.mobile-menu-content')
    
    if (categoryHeader && menuContent) {
      // Header'ın menu içindeki göreceli pozisyonunu bul
      const headerTop = categoryHeader.offsetTop
      
      // 20px üstten boşluk bırakarak smooth scroll yap
      menuContent.scrollTo({
        top: headerTop - 20,
        behavior: 'smooth'
      })
    }
  }
}

function closeMobileAdminCategories() {
  Object.keys(mobileAdminCategoryStates.value).forEach(key => {
    mobileAdminCategoryStates.value[key] = false
  })
}

function toggleMobileUserProfile() {
  isMobileUserProfileOpen.value = !isMobileUserProfileOpen.value
}

function toggleMobileMenu(event) {
  if (event) {
    event.stopPropagation()
  }
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
  closeMobileAdminCategories()
  isMobileUserProfileOpen.value = false
}

function openAdminDropdown() {
  isAdminDropdownOpen.value = true
}

function closeAdminDropdown() {
  isAdminDropdownOpen.value = false
}

function openLeadsDropdown() {
  isLeadsDropdownOpen.value = true
}

function closeLeadsDropdown() {
  isLeadsDropdownOpen.value = false
}

function openSearchModal() {
  showSearchModal.value = true
}

function closeSearchModal() {
  showSearchModal.value = false
}

let categoryCloseTimer = null

function openAdminCategory(category) {
  if (categoryCloseTimer) {
    clearTimeout(categoryCloseTimer)
    categoryCloseTimer = null
  }
  activeAdminCategory.value = category
}

function closeAdminCategory() {
  // Submenu'den ayrılırken gecikme ekle - submenu'ye geçiş için zaman tanı
  categoryCloseTimer = setTimeout(() => {
    activeAdminCategory.value = null
    categoryCloseTimer = null
  }, 400)
}
</script>

<template>
  <div class="container">
    <div class="navbar">
      <div class="brand" @click="goToHome">
        <img alt="Logo" class="logo" :src="companyLogoUrl || defaultLogo" width="50"/>
        <span>{{ companyName }}</span>
      </div>
      
      <!-- Desktop Navigation -->
      <div class="nav-links desktop-nav">
        <RouterLink to="/">
          <Icon icon="mdi:home-outline" width="16" height="16" />
          <span>Startseite</span>
        </RouterLink>

        <!-- Leads Dropdown -->
        <div v-if="isAuthed" class="leads-dropdown" @mouseenter="openLeadsDropdown" @mouseleave="closeLeadsDropdown">
          <RouterLink to="/leads" class="leads-trigger" style="background:none;border:none;display:flex;align-items:center;gap:4px;cursor:pointer;padding:0;">
            <Icon icon="mdi:briefcase-outline" width="16" height="16" />
            Leads
            <Icon icon="mdi:chevron-down" width="12" height="12" />
          </RouterLink>
          <div v-if="isLeadsDropdownOpen" class="leads-dropdown-menu">
            <RouterLink to="/leads" class="leads-menu-item">
              <Icon icon="mdi:gavel" width="16" height="16" />
              Auktion
            </RouterLink>
            <RouterLink to="/sofort-kauf" class="leads-menu-item">
              <Icon icon="mdi:flash" width="16" height="16" />
              Sofort Kauf
            </RouterLink>
          </div>
        </div>

        <RouterLink v-if="isAuthed" to="/dashboard">
          <Icon icon="mdi:view-dashboard-outline" width="16" height="16" />
          <span>Dashboard</span>
        </RouterLink>
        
        <!-- Admin Panel Button (sadece sidebar modunda göster) -->
        <RouterLink 
          v-if="isAuthed && (userTypeId === 'ADMIN' || userTypeId === 'SUPERADMIN') && adminMenuStyle" 
          to="/admin/settings"
          class="admin-panel-btn"
        >
          <Icon icon="mdi:view-dashboard" width="16" height="16" />
          <span>Admin-Panel</span>
        </RouterLink>
        
        <RouterLink v-if="!isAuthed" to="/login">
          <Icon icon="mdi:login-variant" width="16" height="16" />
          <span>Anmelden</span>
        </RouterLink>
        <RouterLink v-if="!isAuthed" to="/register">
          <Icon icon="mdi:account-plus-outline" width="16" height="16" />
          <span>Registrieren</span>
        </RouterLink>
        
        <!-- Admin Dropdown (sadece dropdown modunda göster) -->
        <div v-if="isAuthed && (userTypeId === 'ADMIN' || userTypeId === 'SUPERADMIN') && !adminMenuStyle" class="admin-dropdown" @mouseenter="openAdminDropdown" @mouseleave="closeAdminDropdown">
          <button class="admin-trigger">
          <Icon icon="mdi:account" width="16" height="16" />
            Admin
            <Icon icon="mdi:chevron-down" width="12" height="12" />
          </button>
          <div v-if="isAdminDropdownOpen" class="admin-dropdown-menu">
            <!-- Yönetim Kategorisi -->
            <div class="menu-category" @mouseenter="openAdminCategory('management')" @mouseleave="closeAdminCategory">
              <div class="category-trigger">
                <Icon icon="mdi:view-dashboard-outline" width="16" height="16" />
                <span>Verwaltung</span>
                <Icon icon="mdi:chevron-right" width="14" height="14" class="category-arrow" />
              </div>

              <!-- Submenu -->
              <div v-if="activeAdminCategory === 'management'" class="category-submenu" @mouseenter="openAdminCategory('management')" @mouseleave="closeAdminCategory">
                <RouterLink to="/admin/leads" class="submenu-item">
                  <Icon icon="mdi:briefcase-outline" width="16" height="16" />
                  Leads
                </RouterLink>
                <RouterLink to="/admin/users" class="submenu-item">
                  <Icon icon="mdi:account-group-outline" width="16" height="16" />
                  Benutzer
                </RouterLink>
                <RouterLink to="/admin/statistics" class="submenu-item">
                  <Icon icon="mdi:chart-line-variant" width="16" height="16" />
                  Statistiken
                </RouterLink>
                <RouterLink to="/admin/activity-log" class="submenu-item">
                  <Icon icon="mdi:history" width="16" height="16" />
                  Aktivitätsverlauf
                </RouterLink>
                <RouterLink to="/admin/balance" class="submenu-item">
                  <Icon icon="mdi:wallet-outline" width="16" height="16" />
                  Guthabenverwaltung
                </RouterLink>
                <RouterLink to="/admin/pending-payments" class="submenu-item">
                  <Icon icon="mdi:clock-alert-outline" width="16" height="16" />
                  Ausstehende Zahlungen
                </RouterLink>
                <RouterLink to="/admin/feedback" class="submenu-item">
                  <Icon icon="mdi:comment-multiple-outline" width="16" height="16" />
                  Rückmeldungen
                </RouterLink>
              </div>
            </div>

            <!-- Ayarlar Kategorisi -->
            <div class="menu-category" @mouseenter="openAdminCategory('settings')" @mouseleave="closeAdminCategory">
              <div class="category-trigger">
                <Icon icon="mdi:cog-outline" width="16" height="16" />
                <span>Einstellungen</span>
                <Icon icon="mdi:chevron-right" width="14" height="14" class="category-arrow" />
              </div>

              <!-- Submenu -->
              <div v-if="activeAdminCategory === 'settings'" class="category-submenu" @mouseenter="openAdminCategory('settings')" @mouseleave="closeAdminCategory">
                <RouterLink to="/admin/settings" class="submenu-item">
                  <Icon icon="mdi:cog-outline" width="16" height="16" />
                  Einstellungen
                </RouterLink>
                <RouterLink to="/admin/email-sms-settings" class="submenu-item">
                  <Icon icon="mdi:email-outline" width="16" height="16" />
                  E-Mail/SMS-Einstellungen
                </RouterLink>
                <RouterLink to="/admin/notification-settings" class="submenu-item">
                  <Icon icon="mdi:bell-outline" width="16" height="16" />
                  Benachrichtigungseinstellungen
                </RouterLink>
              </div>
            </div>

            <!-- Yetkiler Kategorisi -->
            <div class="menu-category" @mouseenter="openAdminCategory('permissions')" @mouseleave="closeAdminCategory">
              <div class="category-trigger">
                <Icon icon="mdi:shield-outline" width="16" height="16" />
                <span>Berechtigungen</span>
                <Icon icon="mdi:chevron-right" width="14" height="14" class="category-arrow" />
              </div>

              <!-- Submenu -->
              <div v-if="activeAdminCategory === 'permissions'" class="category-submenu" @mouseenter="openAdminCategory('permissions')" @mouseleave="closeAdminCategory">
                <RouterLink to="/admin/user-types" class="submenu-item">
                  <Icon icon="mdi:account-multiple-outline" width="16" height="16" />
                  Benutzertypen
                </RouterLink>
                <RouterLink to="/admin/lead-type-permissions" class="submenu-item">
                  <Icon icon="mdi:shield-check-outline" width="16" height="16" />
                  Lead-Typ-Berechtigungen
                </RouterLink>
              </div>
            </div>

            <!-- İçerik Yönetimi Kategorisi -->
            <div class="menu-category" @mouseenter="openAdminCategory('content')" @mouseleave="closeAdminCategory">
              <div class="category-trigger">
                <Icon icon="mdi:file-document-outline" width="16" height="16" />
                <span>Inhaltsverwaltung</span>
                <Icon icon="mdi:chevron-right" width="14" height="14" class="category-arrow" />
              </div>

              <!-- Submenu -->
              <div v-if="activeAdminCategory === 'content'" class="category-submenu" @mouseenter="openAdminCategory('content')" @mouseleave="closeAdminCategory">
                <RouterLink to="/admin/faq" class="submenu-item">
                  <Icon icon="mdi:help-circle-outline" width="16" height="16" />
                  FAQ-Verwaltung
                </RouterLink>
                <RouterLink to="/admin/about" class="submenu-item">
                  <Icon icon="mdi:information-outline" width="16" height="16" />
                  Über uns-Verwaltung
                </RouterLink>
                <RouterLink to="/admin/homepage-settings" class="submenu-item">
                  <Icon icon="mdi:home-outline" width="16" height="16" />
                  Startseiten-Verwaltung
                </RouterLink>
                <RouterLink to="/admin/custom-pages" class="submenu-item">
                  <Icon icon="mdi:file-document-edit-outline" width="16" height="16" />
                  Seitenverwaltung
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
        <button v-if="isAuthed" class="search-btn desktop-search-btn" @click="openSearchModal" title="Lead suchen">
          <Icon icon="mdi:magnify" width="20" height="20" />
        </button>
        <div v-if="isAuthed" class="desktop-notification-wrapper">
          <NotificationDropdown />
        </div>
        <UserProfile
          v-if="isAuthed"
          :user="currentUser"
          :role="role" 
          :userType="userType"
          :canAccessAbout="canAccessAbout"
          :canAccessFAQ="canAccessFAQ"
          :canAccessPurchased="canAccessPurchased"
        />
      </div>

      <!-- Mobile Action Buttons (Search, Notification, Hamburger) -->
      <div class="mobile-action-buttons">
        <button v-if="isAuthed" class="search-btn mobile-search-btn" @click="openSearchModal" title="Lead suchen">
          <Icon icon="mdi:magnify" width="20" height="20" />
        </button>
        <div v-if="isAuthed" class="mobile-notification-wrapper">
          <NotificationDropdown />
        </div>
        <button class="mobile-menu-btn" @click.stop="toggleMobileMenu">
          <Icon v-if="!isMobileMenuOpen" icon="mdi:menu" width="24" height="24" />
          <Icon v-else icon="mdi:close" width="24" height="24" />
        </button>
      </div>
    </div>

    <!-- Mobile Menu Overlay -->
    <div v-if="isMobileMenuOpen" class="mobile-menu-overlay" @click.self="closeMobileMenu"></div>
    
    <!-- Mobile Menu -->
    <div class="mobile-menu" :class="{ 'mobile-menu-open': isMobileMenuOpen }">
      <div class="mobile-menu-content">
        <!-- Mobile Menu Header -->
        <div class="mobile-menu-header">
          <div class="mobile-menu-brand">
            <img alt="Logo" class="mobile-menu-logo" :src="companyLogoUrl || defaultLogo" width="32" height="32" />
            <span class="mobile-menu-title">{{ companyName }}</span>
          </div>
          <button class="mobile-menu-close" @click="closeMobileMenu">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        
        <div v-if="isAuthed" class="mobile-user-section">
          <div class="mobile-user-profile-trigger" @click="toggleMobileUserProfile">
            <div class="user-avatar">
              <img
                v-if="currentUser?.profileImage"
                :src="currentUser.profileImage"
                :alt="currentUser?.firstName || 'User'"
                class="avatar-img"
              />
              <div v-else class="avatar-placeholder">
                {{ (currentUser?.firstName?.[0] || 'U').toUpperCase() }}
              </div>
            </div>
            <div class="user-info">
              <div class="user-name">{{ currentUser?.firstName || currentUser?.username || 'Benutzer' }}</div>
              <div class="user-role">{{ userType?.name || 'Benutzer' }}</div>
            </div>
            <Icon :icon="isMobileUserProfileOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'" width="20" height="20" />
          </div>

          <div v-if="isMobileUserProfileOpen" class="mobile-user-profile-menu">
            <RouterLink to="/profile" @click="closeMobileMenu" class="mobile-user-menu-item">
              <Icon icon="mdi:account" width="18" height="18" />
              <span>Profil</span>
            </RouterLink>
            <RouterLink to="/profile/notifications" @click="closeMobileMenu" class="mobile-user-menu-item">
              <Icon icon="mdi:bell-outline" width="18" height="18" />
              <span>Benachrichtigungseinstellungen</span>
            </RouterLink>
            <RouterLink v-if="canAccessPurchased" to="/purchased-leads" @click="closeMobileMenu" class="mobile-user-menu-item">
              <Icon icon="mdi:shopping-outline" width="18" height="18" />
              <span>Meine Käufe</span>
            </RouterLink>
            <button class="mobile-user-menu-item logout-item" @click="logout">
              <Icon icon="mdi:logout-variant" width="18" height="18" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
        
        <RouterLink to="/" @click="closeMobileMenu" class="mobile-nav-link">
          <Icon icon="mdi:home-outline" width="20" height="20" />
          <span>Startseite</span>
        </RouterLink>

        <!-- Leads submenu in mobile -->
        <div v-if="isAuthed" class="mobile-nav-section">
          <div class="mobile-nav-section-header">
            <Icon icon="mdi:briefcase-outline" width="20" height="20" />
            <span>Leads</span>
          </div>
          <RouterLink to="/leads" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
            <Icon icon="mdi:gavel" width="18" height="18" />
            <span>Auktion</span>
          </RouterLink>
          <RouterLink to="/sofort-kauf" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
            <Icon icon="mdi:flash" width="18" height="18" />
            <span>Sofort Kauf</span>
          </RouterLink>
        </div>

        <RouterLink v-if="isAuthed" to="/dashboard" @click="closeMobileMenu" class="mobile-nav-link">
          <Icon icon="mdi:view-dashboard-outline" width="20" height="20" />
          <span>Dashboard</span>
        </RouterLink>

        <button v-if="isAuthed" @click="openSearchModal(); closeMobileMenu();" class="mobile-nav-link mobile-search-btn">
          <Icon icon="mdi:magnify" width="20" height="20" />
          <span>Lead suchen</span>
        </button>

        <RouterLink v-if="!isAuthed" to="/login" @click="closeMobileMenu" class="mobile-nav-link">
          <Icon icon="mdi:login-variant" width="20" height="20" />
          <span>Anmelden</span>
        </RouterLink>
        <RouterLink v-if="!isAuthed" to="/register" @click="closeMobileMenu" class="mobile-nav-link">
          <Icon icon="mdi:account-plus-outline" width="20" height="20" />
          <span>Registrieren</span>
        </RouterLink>

        <!-- Admin Section -->
        <div v-if="isAuthed && (userTypeId === 'ADMIN' || userTypeId === 'SUPERADMIN')" class="mobile-admin-section">
          <!-- Yönetim Kategorisi -->
          <div class="mobile-nav-section">
            <div class="mobile-nav-section-header" data-category="management" @click="toggleMobileAdminCategory('management')" style="cursor: pointer;">
              <Icon icon="mdi:view-dashboard-outline" width="20" height="20" />
              <span>Verwaltung</span>
              <Icon :icon="mobileAdminCategoryStates.management ? 'mdi:chevron-up' : 'mdi:chevron-down'" width="20" height="20" class="category-chevron" />
            </div>
            <div v-if="mobileAdminCategoryStates.management">
              <RouterLink to="/admin/leads" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:briefcase-outline" width="18" height="18" />
                <span>Leads</span>
              </RouterLink>
              <RouterLink to="/admin/users" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:account-group-outline" width="18" height="18" />
                <span>Benutzer</span>
              </RouterLink>
              <RouterLink to="/admin/statistics" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:chart-line-variant" width="18" height="18" />
                <span>Statistiken</span>
              </RouterLink>
              <RouterLink to="/admin/activity-log" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:history" width="18" height="18" />
                <span>Aktivittsverlauf</span>
              </RouterLink>
              <RouterLink to="/admin/balance" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:wallet-outline" width="18" height="18" />
                <span>Guthabenverwaltung</span>
              </RouterLink>
              <RouterLink to="/admin/pending-payments" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:clock-alert-outline" width="18" height="18" />
                <span>Ausstehende Zahlungen</span>
              </RouterLink>
            </div>
          </div>

          <!-- Ayarlar Kategorisi -->
          <div class="mobile-nav-section">
            <div class="mobile-nav-section-header" data-category="settings" @click="toggleMobileAdminCategory('settings')" style="cursor: pointer;">
              <Icon icon="mdi:cog-outline" width="20" height="20" />
              <span>Einstellungen</span>
              <Icon :icon="mobileAdminCategoryStates.settings ? 'mdi:chevron-up' : 'mdi:chevron-down'" width="20" height="20" class="category-chevron" />
            </div>
            <div v-if="mobileAdminCategoryStates.settings">
              <RouterLink to="/admin/settings" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:cog-outline" width="18" height="18" />
                <span>Einstellungen</span>
              </RouterLink>
              <RouterLink to="/admin/email-sms-settings" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:email-outline" width="18" height="18" />
                <span>E-Mail/SMS-Einstellungen</span>
              </RouterLink>
              <RouterLink to="/admin/notification-settings" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:bell-outline" width="18" height="18" />
                <span>Benachrichtigungseinstellungen</span>
              </RouterLink>
            </div>
          </div>

          <!-- Yetkiler Kategorisi -->
          <div class="mobile-nav-section">
            <div class="mobile-nav-section-header" data-category="permissions" @click="toggleMobileAdminCategory('permissions')" style="cursor: pointer;">
              <Icon icon="mdi:shield-outline" width="20" height="20" />
              <span>Berechtigungen</span>
              <Icon :icon="mobileAdminCategoryStates.permissions ? 'mdi:chevron-up' : 'mdi:chevron-down'" width="20" height="20" class="category-chevron" />
            </div>
            <div v-if="mobileAdminCategoryStates.permissions">
              <RouterLink to="/admin/user-types" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:account-multiple-outline" width="18" height="18" />
                <span>Benutzertypen</span>
              </RouterLink>
              <RouterLink to="/admin/lead-type-permissions" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:shield-check-outline" width="18" height="18" />
                <span>Lead-Typ-Berechtigungen</span>
              </RouterLink>
            </div>
          </div>

          <!-- İçerik Yönetimi Kategorisi -->
          <div class="mobile-nav-section">
            <div class="mobile-nav-section-header" data-category="content" @click="toggleMobileAdminCategory('content')" style="cursor: pointer;">
              <Icon icon="mdi:file-document-outline" width="20" height="20" />
              <span>Inhaltsverwaltung</span>
              <Icon :icon="mobileAdminCategoryStates.content ? 'mdi:chevron-up' : 'mdi:chevron-down'" width="20" height="20" class="category-chevron" />
            </div>
            <div v-if="mobileAdminCategoryStates.content">
              <RouterLink to="/admin/faq" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:help-circle-outline" width="18" height="18" />
                <span>FAQ-Verwaltung</span>
              </RouterLink>
              <RouterLink to="/admin/about" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:information-outline" width="18" height="18" />
                <span>Über uns-Verwaltung</span>
              </RouterLink>
              <RouterLink to="/admin/homepage-settings" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:home-outline" width="18" height="18" />
                <span>Startseiten-Verwaltung</span>
              </RouterLink>
              <RouterLink to="/admin/custom-pages" @click="closeMobileMenu" class="mobile-nav-link mobile-nav-sublink">
                <Icon icon="mdi:file-document-edit-outline" width="18" height="18" />
                <span>Seitenverwaltung</span>
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isNavigating" class="nav-overlay"><div class="spinner" aria-label="Wird geladen"></div></div>
    
    <!-- Admin Sidebar Menu -->
    <div v-if="isAdminRoute && isAuthed && (userTypeId === 'ADMIN' || userTypeId === 'SUPERADMIN') && adminMenuStyle" class="admin-sidebar-container">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-header">
          <div class="admin-sidebar-brand">
            <img alt="Logo" class="logo" :src="companyLogoUrl || defaultLogo" width="40"/>
            <span>{{ companyName }}</span>
          </div>
        </div>
        
        <nav class="admin-sidebar-nav">
          <!-- Yönetim -->
          <div class="admin-sidebar-section">
            <div class="admin-sidebar-section-title">
              <Icon icon="mdi:view-dashboard-outline" width="20" height="20" />
              <span>Verwaltung</span>
            </div>
            <RouterLink to="/admin/leads" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:briefcase-outline" width="18" height="18" />
              <span>Leads</span>
            </RouterLink>
            <RouterLink to="/admin/users" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:account-group-outline" width="18" height="18" />
              <span>Benutzer</span>
            </RouterLink>
            <RouterLink to="/admin/statistics" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:chart-line-variant" width="18" height="18" />
              <span>Statistiken</span>
            </RouterLink>
            <RouterLink to="/admin/activity-log" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:history" width="18" height="18" />
              <span>Aktivittsverlauf</span>
            </RouterLink>
            <RouterLink to="/admin/balance" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:wallet-outline" width="18" height="18" />
              <span>Guthabenverwaltung</span>
            </RouterLink>
            <RouterLink to="/admin/pending-payments" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:clock-alert-outline" width="18" height="18" />
              <span>Ausstehende Zahlungen</span>
            </RouterLink>
            <RouterLink to="/admin/feedback" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:comment-multiple-outline" width="18" height="18" />
              <span>Rückmeldungen</span>
            </RouterLink>
          </div>

          <!-- Ayarlar -->
          <div class="admin-sidebar-section">
            <div class="admin-sidebar-section-title">
              <Icon icon="mdi:cog-outline" width="20" height="20" />
              <span>Einstellungen</span>
            </div>
            <RouterLink to="/admin/settings" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:cog-outline" width="18" height="18" />
              <span>Einstellungen</span>
            </RouterLink>
            <RouterLink to="/admin/email-sms-settings" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:email-outline" width="18" height="18" />
              <span>E-Mail/SMS-Einstellungen</span>
            </RouterLink>
            <RouterLink to="/admin/notification-settings" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:bell-outline" width="18" height="18" />
              <span>Benachrichtigungseinstellungen</span>
            </RouterLink>
          </div>

          <!-- Yetkiler -->
          <div class="admin-sidebar-section">
            <div class="admin-sidebar-section-title">
              <Icon icon="mdi:shield-outline" width="20" height="20" />
              <span>Berechtigungen</span>
            </div>
            <RouterLink to="/admin/user-types" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:account-multiple-outline" width="18" height="18" />
              <span>Benutzertypen</span>
            </RouterLink>
            <RouterLink to="/admin/lead-type-permissions" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:shield-check-outline" width="18" height="18" />
              <span>Lead-Typ-Berechtigungen</span>
            </RouterLink>
          </div>

          <!-- İçerik Yönetimi -->
          <div class="admin-sidebar-section">
            <div class="admin-sidebar-section-title">
              <Icon icon="mdi:file-document-outline" width="20" height="20" />
              <span>Inhaltsverwaltung</span>
            </div>
            <RouterLink to="/admin/faq" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:help-circle-outline" width="18" height="18" />
              <span>FAQ-Verwaltung</span>
            </RouterLink>
            <RouterLink to="/admin/about" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:information-outline" width="18" height="18" />
              <span>Über uns-Verwaltung</span>
            </RouterLink>
            <RouterLink to="/admin/homepage-settings" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:home-outline" width="18" height="18" />
              <span>Startseiten-Verwaltung</span>
            </RouterLink>
            <RouterLink to="/admin/custom-pages" class="admin-sidebar-link" active-class="active">
              <Icon icon="mdi:file-document-edit-outline" width="18" height="18" />
              <span>Seitenverwaltung</span>
            </RouterLink>
          </div>
        </nav>
      </aside>
      
      <div class="admin-sidebar-content">
        <AdminLayout :key="route.fullPath">
          <RouterView />
        </AdminLayout>
      </div>
    </div>
    
    <!-- Normal View (Dropdown Menu) -->
    <RouterView v-else v-slot="{ Component }">
      <transition name="page">
        <component
          v-if="!isAdminRoute"
          :is="Component"
          :key="`normal-${route.fullPath}`"
        />
        <AdminLayout v-else :key="`admin-dropdown-${route.fullPath}`">
          <component :is="Component" />
        </AdminLayout>
      </transition>
    </RouterView>

    <!-- Footer (sadece sidebar modunda değil) -->
    <footer v-if="!adminMenuStyle || !isAdminRoute" class="footer">
      <div class="footer-content">
        <div class="footer-column">
          <div class="footer-brand">
            <div class="footer-logo">
              <Icon icon="mdi:star-outline" width="24" height="24" />
              <span>{{ companyName }}</span>
            </div>
            <p class="footer-description">
              {{ footerDescription }}
            </p>
            <div class="footer-contact">
              <div class="contact-item">
                <Icon icon="mdi:phone-outline" width="16" height="16" />
                <span>{{ footerPhone }}</span>
              </div>
              <div class="contact-item">
                <Icon icon="mdi:email-outline" width="16" height="16" />
                <span>{{ footerEmail }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="footer-column" v-if="servicesLinks.length > 0">
          <h4>Services</h4>
          <ul class="footer-links">
            <li v-for="(link, index) in servicesLinks" :key="index">
              <a :href="link.url">{{ link.text }}</a>
            </li>
          </ul>
        </div>

        <div class="footer-column" v-if="supportLinks.length > 0">
          <h4>Support</h4>
          <ul class="footer-links">
            <li v-for="(link, index) in supportLinks" :key="index">
              <a :href="link.url">{{ link.text }}</a>
            </li>
          </ul>
        </div>

        <div class="footer-column" v-if="legalLinks.length > 0">
          <h4>Rechtliches</h4>
          <ul class="footer-links">
            <li v-for="(link, index) in legalLinks" :key="index">
              <a :href="link.url">{{ link.text }}</a>
            </li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="footer-bottom-content">
          <p>{{ footerNote || `© 2024 ${companyName}. Alle Rechte vorbehalten.` }}</p>
          <p v-if="tradeRegisterNumber">{{ tradeRegisterNumber }}</p>
        </div>
        <div v-if="socialMedia.facebook || socialMedia.twitter || socialMedia.linkedin || socialMedia.instagram" class="footer-social">
          <a v-if="socialMedia.facebook" :href="socialMedia.facebook" target="_blank" rel="noopener noreferrer" class="social-link">
            <Icon icon="mdi:facebook" width="20" height="20" />
          </a>
          <a v-if="socialMedia.twitter" :href="socialMedia.twitter" target="_blank" rel="noopener noreferrer" class="social-link">
            <Icon icon="mdi:twitter" width="20" height="20" />
          </a>
          <a v-if="socialMedia.linkedin" :href="socialMedia.linkedin" target="_blank" rel="noopener noreferrer" class="social-link">
            <Icon icon="mdi:linkedin" width="20" height="20" />
          </a>
          <a v-if="socialMedia.instagram" :href="socialMedia.instagram" target="_blank" rel="noopener noreferrer" class="social-link">
            <Icon icon="mdi:instagram" width="20" height="20" />
          </a>
        </div>
      </div>
    </footer>
  </div>
  
  <!-- Global Alert System -->
  <GlobalAlert />

  <!-- Lead Search Modal -->
  <LeadSearchModal :show="showSearchModal" @close="closeSearchModal" />

  <!-- Scroll to Top Button -->
  <ScrollToTop />

</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
}

.brand {
  border-right: 1px solid #e2e8f0;
  padding-right: 0.75rem;
  margin-right: 0.75rem;
  align-self: stretch;
  display: flex;
  align-items: center;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-left: 1px solid var(--color-border);
  text-decoration: none;
  color: #374151;
  transition: all 0.2s ease;
  border-radius: 0.375rem;
  margin: 0 0.125rem;
  height: 2.5rem;
  box-sizing: border-box;
}

nav a:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #1f2937;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

nav a.router-link-exact-active {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  font-weight: 500;
}

nav a.router-link-exact-active:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
}

nav a svg {
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

nav a:hover svg {
  transform: scale(1.1);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {}

/* Leads Dropdown Styles */
.leads-dropdown {
  position: relative;
  display: inline-block;
}

.leads-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  color: #374151;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.2s;
  height: 2.5rem;
}

.leads-trigger:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #1f2937;
  transform: translateY(-1px);

}

.leads-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 12rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 50;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.2s;
  pointer-events: none;
  /* Menü ile tetikleyici arasında boşluk bırakma: hover sırasında kaybolmayı engellemek için sıfırlandı */
  margin-top: 0;
}

.leads-dropdown:hover .leads-dropdown-menu {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.leads-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #374151;
  text-decoration: none;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.leads-menu-item:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #1f2937;
}

.leads-menu-item svg {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.leads-menu-item:hover svg {
  transform: scale(1.1);
}

/* Admin Dropdown Styles */
.admin-dropdown {
  position: relative;
  display: inline-block;
}

.admin-dropdown::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: -1;
}

.admin-dropdown:hover::before {
  opacity: 1;
}

nav a.admin-panel-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white !important;
  text-decoration: none;
  font-size: 1rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
  font-weight: 500;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  margin: 0 0.125rem;
  height: 2.5rem;
  box-sizing: border-box;
}

nav a.admin-panel-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  color: white !important;
}

nav a.admin-panel-btn.router-link-exact-active {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white !important;
}

.admin-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  color: #374151;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.admin-trigger:hover {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  color: #1f2937;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.admin-trigger svg {
  transition: transform 0.2s;
}

.admin-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 15rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 50;
  overflow: visible;
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;

  padding: 0.25rem 0;
}

/* Menu Categories */
.menu-category {
  position: relative;
  display: block;
  overflow: visible;
}

.menu-category:not(:last-child) {
  border-bottom: 1px solid #e2e8f0;
}

.category-trigger {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.category-trigger:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #1f2937;
}

.category-trigger span {
  flex: 1;
}

.category-arrow {
  margin-left: auto;
  transition: transform 0.2s ease;
  color: #9ca3af;
}

.category-trigger:hover .category-arrow {
  transform: translateX(2px);
  color: #374151;
}

.category-trigger svg:first-child {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.category-trigger:hover svg:first-child {
  transform: scale(1.1);
}

/* Category Submenu */
.category-submenu {
  position: absolute;
  left: calc(100% - 1rem);
  top: -0.25rem;
  min-width: 14rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 60;

  opacity: 1;
  transform: translateX(0);
  overflow: hidden;
  pointer-events: auto;
}

@keyframes slideInSubmenu {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.submenu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #374151;
  text-decoration: none;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.submenu-item:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  padding-left: 1.25rem;
}

.submenu-item svg {
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.submenu-item:hover svg {
  transform: scale(1.1);
}

@keyframes slideInFromLeft {
  to {
    transform: translateX(0);
    opacity: 1;
  }
}


/* Mobile Nav Section Styles */
.mobile-nav-section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 0.375rem;
  margin-bottom: 0.25rem;
}

.mobile-nav-section-header svg {
  flex-shrink: 0;
}

.mobile-nav-section-header span {
  flex: 1;
}

.category-chevron {
  margin-left: auto;
  transition: transform 0.2s ease;
  color: #9ca3af;
  flex-shrink: 0;
}

.mobile-nav-sublink {
  padding-left: 2.5rem !important;
  font-size: 0.875rem !important;
  color: #6b7280 !important;
}

.mobile-nav-sublink:hover {
  color: #1f2937 !important;
}

.mobile-admin-section {
  border-top: 1px solid #e2e8f0;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}

.mobile-category-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.625rem 1rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f0f1f3;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #4b5563;
  font-weight: 500;
  font-size: 0.875rem;
}

.mobile-category-toggle:hover {
  background: #f9fafb;
}

.mobile-category-toggle:active {
  background: #f3f4f6;
}

.mobile-category-toggle-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 1;
}

.mobile-category-toggle-header svg {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.mobile-category-toggle:hover .mobile-category-toggle-header svg {
  opacity: 0.8;
}

.mobile-category-toggle svg:last-child {
  transition: transform 0.2s ease;
  flex-shrink: 0;
  opacity: 0.5;
}

.mobile-category-toggle:hover svg:last-child {
  opacity: 0.7;
}

.mobile-category-items {
  background: #fafbfc;
  border-bottom: 1px solid #f0f1f3;
  padding: 0.25rem 0;
  animation: slideDown 0.25s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
    overflow: hidden;
  }
  to {
    opacity: 1;
    max-height: 600px;
    overflow: visible;
  }
}

.mobile-category-items .mobile-nav-link {
  padding: 0.5rem 1rem 0.5rem 2.75rem !important;
  background: #fafbfc;
  border: none;
  border-radius: 0;
  font-size: 0.8rem;
  color: #6b7684;
}

.mobile-category-items .mobile-nav-link:hover {
  background: #f0f1f3 !important;
  color: #374151 !important;
  padding-left: 3rem !important;
}

.mobile-category-items .mobile-nav-link svg {
  opacity: 0.7;
}

.mobile-category-items .mobile-nav-link:hover svg {
  opacity: 1;
}

.mobile-category-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem 1rem 0.5rem;
  margin-top: 0.5rem;
  background: #f9fafb;
}

.mobile-category-label:first-child {
  margin-top: 0;
}

.mobile-category-label svg {
  flex-shrink: 0;
  opacity: 0.7;
}

.mobile-user-section {
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 0.5rem;
  padding: 0.75rem 1rem;
}

.mobile-user-profile-trigger {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.5rem;
  border-radius: 0.375rem;
}

.mobile-user-profile-trigger:active {
  background: #f3f4f6;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #e2e8f0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 13px;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}
.mobile-user-profile-trigger{
  background: linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%);
}
.mobile-user-profile-menu {
  background: #fafbfc;
  border: 1px solid #e2e8f0;
  border-top: none;
  border-radius: 0 0 0.375rem 0.375rem;
  overflow: hidden;
  animation: slideDown 0.2s ease;
  margin-top: -1px;
}

.mobile-user-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #374151;
  text-decoration: none;
  background: #fafbfc;
  border: none;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  width: 100%;
  text-align: left;
}

.mobile-user-menu-item:last-child {
  border-bottom: none;
}

.mobile-user-menu-item:hover {
  background: #f0f1f3;
  color: #1f2937;
  padding-left: 1.25rem;
}

.mobile-user-menu-item.logout-item {
  color: #ef4444;
}

.mobile-user-menu-item.logout-item:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* Search Button Styles */
.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  border: none;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 0.5rem;
}

.search-btn:hover {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
}

.search-btn svg {
  transition: transform 0.2s ease;
}

.search-btn:hover svg {
  transform: scale(1.1);
}

/* Desktop only search and notification */
.desktop-search-btn,
.desktop-notification-wrapper {
  display: none;
}

@media (min-width: 1201px) {
  .desktop-search-btn,
  .desktop-notification-wrapper {
    display: block;
  }
  
  .mobile-action-buttons {
    display: none !important;
  }
}

/* Mobile Action Buttons Container */
.mobile-action-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mobile-search-btn {
  margin-right: 0;
}

.mobile-notification-wrapper {
  display: flex;
  align-items: center;
}

/* Mobile Search Button (in mobile menu) */
.mobile-nav-link.mobile-search-btn {
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.mobile-nav-link.mobile-search-btn:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

/* Hide mobile action buttons on desktop */
@media (min-width: 1201px) {
  .mobile-action-buttons {
    display: none !important;
  }
}

/* Show mobile action buttons on mobile */
@media (max-width: 1200px) {
  .mobile-action-buttons {
    display: flex;
  }
  
  .desktop-search-btn,
  .desktop-notification-wrapper {
    display: none !important;
  }
}

/* Admin Sidebar Styles */
.admin-sidebar-container {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
  position: relative;
  overflow-x: hidden;
}

.admin-sidebar {
  width: 260px;
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  position: revert !important;
  left: 0 !important;
  top: var(--navbar-height, 60px) !important;
  /* height: calc(3000vh - var(--navbar-height, 60px)) !important; */
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 99;
  will-change: auto;
  transform: none !important;
}

.admin-sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  display: none;
}

.admin-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1rem;
  color: #1f2937;
}

.admin-sidebar-brand .logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.admin-sidebar-nav {
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
  margin-top: 0!important;
}

.admin-sidebar-section {
  margin-bottom: 12px;
  margin-top: 0.5rem!important;
}

.admin-sidebar-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6b7280;
  margin-bottom: 4px;
  background: #f3f4f6;
  border-radius: 4px;
  margin-left: 8px;
  margin-right: 8px;
}

.admin-sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  color: #374151;
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.admin-sidebar-link:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.admin-sidebar-link.active {
  background: #eff6ff;
  color: #3b82f6;
  border-left-color: #3b82f6;
  font-weight: 600;
}

.admin-sidebar-link svg {
  flex-shrink: 0;
}

.admin-sidebar-content {
  flex: 1;

  min-height: 100vh;

}

@media (max-width: 768px) {
  .admin-sidebar {
    display: none;
  }
  
  .admin-sidebar-content {
    margin-left: 0;
    padding-top: 0;
  }
  
  .admin-sidebar-container {
    flex-direction: column;
  }
}
</style>
