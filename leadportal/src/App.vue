<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
import UserProfile from './components/UserProfile.vue'
import GlobalAlert from './components/GlobalAlert.vue'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { checkPageAccess } from './utils/permissions.js'
import defaultLogo from '@/assets/images/logo.png'
import api from '@/utils/axios.js'

const router = useRouter()

function logout() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // LocalStorage ve sessionStorage'ı temizle
      window.localStorage.removeItem('token')
      window.localStorage.removeItem('role')
      window.localStorage.removeItem('userType')
      window.localStorage.removeItem('userTypeId')
      window.sessionStorage.removeItem('token')
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
const footerDescription = ref('Almanya\'nın önde gelen lead pazar yeri. Profesyonel açık artırmalar ve lead yönetimi platformu.')
const tradeRegisterNumber = ref('İstanbul Ticaret Sicil No: 12345')
const servicesLinks = ref([])
const supportLinks = ref([])
const legalLinks = ref([])
const socialMedia = ref({ facebook: '', twitter: '', linkedin: '', instagram: '' })

async function loadBranding() {
  try {
    const CACHE_KEY = 'branding_cache'
    const CACHE_TIMESTAMP_KEY = 'branding_cache_timestamp'
    const CACHE_DURATION = 3 * 24 * 60 * 60 * 1000 // 3 gün (milliseconds)
    
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
    footerDescription.value = 'Almanya\'nın önde gelen lead pazar yeri. Profesyonel açık artırmalar ve lead yönetimi platformu.'
    tradeRegisterNumber.value = 'İstanbul Ticaret Sicil No: 12345'
  }
}

function applyBrandingSettings(settings) {
  companyName.value = settings.companyName || 'LeadPortal'
  companyLogoUrl.value = settings.companyLogoUrl || ''
  footerPhone.value = settings.footerPhone || '+90 (212) 123 45 67'
  footerEmail.value = settings.footerEmail || 'info@leadportal.com'
  footerNote.value = settings.footerNote || ''
  footerDescription.value = settings.footerDescription || 'Almanya\'nın önde gelen lead pazar yeri. Profesyonel açık artırmalar ve lead yönetimi platformu.'
  tradeRegisterNumber.value = settings.tradeRegisterNumber || 'İstanbul Ticaret Sicil No: 12345'
  
  // Load links
  servicesLinks.value = settings.servicesLinks || [
    { text: 'Canlı Müzayede', url: '#' },
    { text: 'Yaklaşan açık artırmalar', url: '#' },
    { text: 'Doğrudan satın alma', url: '#' },
    { text: 'Gösterge Paneli', url: '#' },
    { text: 'Potansiyel Müşteri Yönetimi', url: '#' }
  ]
  
  supportLinks.value = settings.supportLinks || [
    { text: 'SSS', url: '#' },
    { text: 'Temas etmek', url: '#' },
    { text: 'Yardım Merkezi', url: '#' },
    { text: 'Sistem Durumu', url: '#' }
  ]
  
  legalLinks.value = settings.legalLinks || [
    { text: 'Baskı', url: '#' },
    { text: 'Gizlilik Politikası', url: '#' },
    { text: 'Şartlar ve koşullar', url: '#' },
    { text: 'Cayma hakkı', url: '#' },
    { text: 'Çerez Politikası', url: '#' }
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

onMounted(() => {
  updateAuth()
  loadBranding()
  loadDesignSettings()
  window.addEventListener('auth-change', onAuthChange)
  window.addEventListener('settings-change', loadBranding)
  window.addEventListener('design-settings-change', loadDesignSettings)
  window.addEventListener('user-logout', logout)
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
  window.removeEventListener('auth-change', onAuthChange)
  window.removeEventListener('settings-change', loadBranding)
  window.removeEventListener('design-settings-change', loadDesignSettings)
  window.removeEventListener('user-logout', logout)
})

const isNavigating = ref(false)
const isMobileMenuOpen = ref(false)
const isAdminDropdownOpen = ref(false)

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

function openAdminDropdown() {
  isAdminDropdownOpen.value = true
}

function closeAdminDropdown() {
  isAdminDropdownOpen.value = false
}
</script>

<template>
  <div class="container">
    <div class="navbar">
      <div class="brand" @click="goToHome">
        <img alt="Logo" class="logo" :src="companyLogoUrl || defaultLogo" width="40"/>
        <span>{{ companyName }}</span>
      </div>
      
      <!-- Desktop Navigation -->
      <div class="nav-links desktop-nav">
        <RouterLink to="/">Anasayfa</RouterLink>
        <RouterLink to="/leads">Leadler</RouterLink>
        <RouterLink v-if="canAccessAbout" to="/about">Hakkında</RouterLink>
        <RouterLink v-if="canAccessFAQ" to="/faq">FAQ</RouterLink>
        <RouterLink v-if="isAuthed && canAccessPurchased" to="/purchased-leads">Satın Aldıklarım</RouterLink>
        <RouterLink v-if="!isAuthed" to="/login">Giriş</RouterLink>
        
        <!-- Admin Dropdown -->
        <div v-if="isAuthed && (userTypeId === 'ADMIN' || userTypeId === 'SUPERADMIN')" class="admin-dropdown" @mouseenter="openAdminDropdown" @mouseleave="closeAdminDropdown">
          <button class="admin-trigger">
            Admin
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </button>
          <div v-if="isAdminDropdownOpen" class="admin-dropdown-menu">
            <RouterLink to="/admin/leads" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
                <rect x="9" y="11" width="6" height="11"/>
                <path d="M9 7v4"/>
                <path d="M15 7v4"/>
                <path d="M9 7a4 4 0 0 1 4-4 4 4 0 0 1 4 4v4"/>
              </svg>
              Leadler
            </RouterLink>
            <RouterLink to="/admin/users/new" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              Kullanıcılar
            </RouterLink>
            
            <RouterLink to="/admin/statistics" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="20" x2="12" y2="10"/>
                <line x1="18" y1="20" x2="18" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="16"/>
              </svg>
              İstatistikler
            </RouterLink>
            <RouterLink to="/admin/settings" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Ayarlar
            </RouterLink>
            <RouterLink to="/admin/user-types" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Kullanıcı Tipleri
            </RouterLink>
            <RouterLink to="/admin/lead-type-permissions" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              Lead Tipi Yetkileri
            </RouterLink>
            <RouterLink to="/admin/faq" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              FAQ Yönetimi
            </RouterLink>
            <RouterLink to="/admin/about" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12"/>
                <path d="M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/>
              </svg>
              Hakkında Yönetimi
            </RouterLink>
            <RouterLink to="/admin/homepage-settings" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9.5 12 3l9 6.5"/>
                <path d="M19 10v10h-5v-6h-4v6H5V10"/>
              </svg>
              Ana Sayfa Ayarları
            </RouterLink>
            <RouterLink to="/admin/email-sms-settings" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Mail/SMS Ayarları
            </RouterLink>
            <RouterLink to="/admin/design-settings" class="menu-item" style="display: none!important;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m10.5-5.5L15 3.5m-6 6L3.5 15m6-6L15 20.5m-6-6L3.5 9"/>
              </svg>
              Tasarım Ayarları
            </RouterLink>
          </div>
        </div>
        <UserProfile 
          v-if="isAuthed" 
          :user="currentUser" 
          :role="role" 
          :userType="userType"
        />
      </div>

      <!-- Mobile Menu Button -->
      <button class="mobile-menu-btn" @click="toggleMobileMenu">
        <svg v-if="!isMobileMenuOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Mobile Menu Overlay -->
    <div v-if="isMobileMenuOpen" class="mobile-menu-overlay" @click="closeMobileMenu"></div>
    
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <RouterLink to="/" @click="closeMobileMenu" class="mobile-nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          <span>Anasayfa</span>
        </RouterLink>

        <RouterLink to="/leads" @click="closeMobileMenu" class="mobile-nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Leadler</span>
        </RouterLink>
        
        <RouterLink v-if="canAccessAbout" to="/about" @click="closeMobileMenu" class="mobile-nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Hakkında</span>
        </RouterLink>
        
        <RouterLink v-if="canAccessFAQ" to="/faq" @click="closeMobileMenu" class="mobile-nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>FAQ</span>
        </RouterLink>
        
        <RouterLink v-if="isAuthed && canAccessPurchased" to="/purchased-leads" @click="closeMobileMenu" class="mobile-nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <span>Satın Aldıklarım</span>
        </RouterLink>
        
        <RouterLink v-if="!isAuthed" to="/login" @click="closeMobileMenu" class="mobile-nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10,17 15,12 10,7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          <span>Giriş</span>
        </RouterLink>
        
        <!-- Admin Section -->
        <div v-if="isAuthed && (userTypeId === 'ADMIN' || userTypeId === 'SUPERADMIN')" class="mobile-admin-section">
          <div class="mobile-admin-label">Admin</div>
          
          <RouterLink to="/admin/leads" @click="closeMobileMenu" class="mobile-nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span>Leadler</span>
          </RouterLink>
          
          <RouterLink to="/admin/users/new" @click="closeMobileMenu" class="mobile-nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            <span>Kullanıcılar</span>
          </RouterLink>
         
          
          <RouterLink to="/admin/statistics" @click="closeMobileMenu" class="mobile-nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="20" x2="12" y2="10"/>
              <line x1="18" y1="20" x2="18" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
            <span>İstatistikler</span>
          </RouterLink>

          <RouterLink to="/admin/settings" @click="closeMobileMenu" class="mobile-nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Ayarlar</span>
          </RouterLink>
          
          <RouterLink to="/admin/user-types" @click="closeMobileMenu" class="mobile-nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Kullanıcı Tipleri</span>
          </RouterLink>
          
          <RouterLink to="/admin/lead-type-permissions" @click="closeMobileMenu" class="mobile-nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            <span>Lead Tipi Yetkileri</span>
          </RouterLink>
          
          <RouterLink to="/admin/faq" @click="closeMobileMenu" class="mobile-nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>FAQ Yönetimi</span>
          </RouterLink>
          
          <RouterLink to="/admin/about" @click="closeMobileMenu" class="mobile-nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12"/>
              <path d="M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/>
            </svg>
            <span>Hakkında Yönetimi</span>
          </RouterLink>
          
          <RouterLink to="/admin/homepage-settings" @click="closeMobileMenu" class="mobile-nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9.5 12 3l9 6.5"/>
              <path d="M19 10v10h-5v-6h-4v6H5V10"/>
            </svg>
            <span>Ana Sayfa Ayarları</span>
          </RouterLink>
          
          <RouterLink to="/admin/email-sms-settings" @click="closeMobileMenu" class="mobile-nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>Mail/SMS Ayarları</span>
          </RouterLink>
          
          <RouterLink to="/admin/design-settings" @click="closeMobileMenu" class="mobile-nav-link" style="display: none!important;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m10.5-5.5L15 3.5m-6 6L3.5 15m6-6L15 20.5m-6-6L3.5 9"/>
            </svg>
            <span>Tasarım Ayarları</span>
          </RouterLink>
        </div>
        
        <div v-if="isAuthed" class="mobile-user-section">
          <UserProfile 
            :user="currentUser" 
            :role="role" 
            :userType="userType"
          />
          <button class="mobile-logout-btn" @click="logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Çıkış</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="isNavigating" class="nav-overlay"><div class="spinner" aria-label="Yükleniyor"></div></div>
    <RouterView v-slot="{ Component }">
      <transition name="page">
        <component :is="Component" />
      </transition>
    </RouterView>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-column">
          <div class="footer-brand">
            <div class="footer-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>{{ companyName }}</span>
            </div>
            <p class="footer-description">
              {{ footerDescription }}
            </p>
            <div class="footer-contact">
              <div class="contact-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span>{{ footerPhone }}</span>
              </div>
              <div class="contact-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>{{ footerEmail }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="footer-column" v-if="servicesLinks.length > 0">
          <h4>Hizmetler</h4>
          <ul class="footer-links">
            <li v-for="(link, index) in servicesLinks" :key="index">
              <a :href="link.url">{{ link.text }}</a>
            </li>
          </ul>
        </div>

        <div class="footer-column" v-if="supportLinks.length > 0">
          <h4>Destek</h4>
          <ul class="footer-links">
            <li v-for="(link, index) in supportLinks" :key="index">
              <a :href="link.url">{{ link.text }}</a>
            </li>
          </ul>
        </div>

        <div class="footer-column" v-if="legalLinks.length > 0">
          <h4>Yasal</h4>
          <ul class="footer-links">
            <li v-for="(link, index) in legalLinks" :key="index">
              <a :href="link.url">{{ link.text }}</a>
            </li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="footer-bottom-content">
          <p>{{ footerNote || `© 2024 ${companyName}. Tüm hakları saklıdır.` }}</p>
          <p v-if="tradeRegisterNumber">{{ tradeRegisterNumber }}</p>
        </div>
        <div v-if="socialMedia.facebook || socialMedia.twitter || socialMedia.linkedin || socialMedia.instagram" class="footer-social">
          <a v-if="socialMedia.facebook" :href="socialMedia.facebook" target="_blank" rel="noopener noreferrer" class="social-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a v-if="socialMedia.twitter" :href="socialMedia.twitter" target="_blank" rel="noopener noreferrer" class="social-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
          </a>
          <a v-if="socialMedia.linkedin" :href="socialMedia.linkedin" target="_blank" rel="noopener noreferrer" class="social-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <a v-if="socialMedia.instagram" :href="socialMedia.instagram" target="_blank" rel="noopener noreferrer" class="social-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  </div>
  
  <!-- Global Alert System -->
  <GlobalAlert />
  
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
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
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {}

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
  min-width: 200px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 50;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-15px) scale(0.95);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.admin-dropdown:hover .admin-dropdown-menu {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.admin-dropdown-menu a {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #374151;
  text-decoration: none;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
  transform: translateX(-10px);
  opacity: 0;
  animation: slideInFromLeft 0.3s ease forwards;
}

.admin-dropdown-menu a:nth-child(1) { animation-delay: 0.05s; }
.admin-dropdown-menu a:nth-child(2) { animation-delay: 0.1s; }
.admin-dropdown-menu a:nth-child(3) { animation-delay: 0.15s; }
.admin-dropdown-menu a:nth-child(4) { animation-delay: 0.2s; }

.admin-dropdown-menu a:last-child {
  border-bottom: none;
}

.admin-dropdown-menu a:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #1f2937;
  transform: translateX(5px);
  box-shadow: inset 3px 0 0 var(--text);
}

.admin-dropdown-menu a svg {
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.admin-dropdown-menu a:hover svg {
  transform: scale(1.1);
  color: var(--text);
}

@keyframes slideInFromLeft {
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.mobile-admin-section {
  border-top: 1px solid #e2e8f0;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}

.mobile-admin-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.5rem 1rem;
  margin-bottom: 0.25rem;
}

.mobile-user-section {
  border-top: 1px solid #e2e8f0;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-user-section .user-profile {
  margin: 0 1rem;
  min-width: auto;
}

.mobile-logout-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 0.5rem;
  margin: 0 0.5rem;
}

.mobile-logout-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}
</style>
