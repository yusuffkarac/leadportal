<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { checkPageAccess } from './utils/permissions.js'
import defaultLogo from '@/assets/images/logo.png'

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

// Branding
const companyName = ref('LeadPortal')
const companyLogoUrl = ref('')
const footerPhone = ref('+90 (212) 123 45 67')
const footerEmail = ref('info@leadportal.com')
const footerNote = ref('')
function loadBranding() {
  try {
    companyName.value = localStorage.getItem('companyName') || 'LeadPortal'
    companyLogoUrl.value = localStorage.getItem('companyLogoUrl') || ''
    footerPhone.value = localStorage.getItem('footerPhone') || '+90 (212) 123 45 67'
    footerEmail.value = localStorage.getItem('footerEmail') || 'info@leadportal.com'
    footerNote.value = localStorage.getItem('footerNote') || ''
    
    // Favicon'u localStorage'dan veya sessionStorage'dan yükle
    const savedFavicon = localStorage.getItem('faviconUrl') || sessionStorage.getItem('faviconUrl')
    if (savedFavicon) {
      updateFavicon(savedFavicon)
    }
  } catch {}
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
  window.addEventListener('auth-change', onAuthChange)
  window.addEventListener('settings-change', loadBranding)
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
              Kullanıcı Ekle
            </RouterLink>
            <RouterLink to="/admin/company-settings" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="14" rx="2"/>
                <path d="M7 21h10"/>
              </svg>
              Firma Ayarları
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
          </div>
        </div>
        <button v-if="isAuthed" class="logout-btn" @click="logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Çıkış</span>
        </button>
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
            <span>Kullanıcı Ekle</span>
          </RouterLink>
          
          <RouterLink to="/admin/company-settings" @click="closeMobileMenu" class="mobile-nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="14" rx="2"/>
              <path d="M7 21h10"/>
            </svg>
            <span>Firma Ayarları</span>
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
        </div>
        
        <button v-if="isAuthed" class="mobile-logout-btn" @click="logout">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Çıkış</span>
        </button>
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
              Almanya'nın önde gelen lead pazar yeri. Profesyonel açık artırmalar ve lead yönetimi platformu.
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

        <div class="footer-column">
          <h4>Hizmetler</h4>
          <ul class="footer-links">
            <li><a href="#">Canlı Müzayede</a></li>
            <li><a href="#">Yaklaşan açık artırmalar</a></li>
            <li><a href="#">Doğrudan satın alma</a></li>
            <li><a href="#">Gösterge Paneli</a></li>
            <li><a href="#">Potansiyel Müşteri Yönetimi</a></li>
          </ul>
        </div>

        <div class="footer-column">
          <h4>Destek</h4>
          <ul class="footer-links">
            <li><a href="#">SSS</a></li>
            <li><a href="#">Temas etmek</a></li>
            <li><a href="#">Yardım Merkezi</a></li>
            <li><a href="#">Sistem Durumu</a></li>
          </ul>
        </div>

        <div class="footer-column">
          <h4>Yasal</h4>
          <ul class="footer-links">
            <li><a href="#">Baskı</a></li>
            <li><a href="#">Gizlilik Politikası</a></li>
            <li><a href="#">Şartlar ve koşullar</a></li>
            <li><a href="#">Cayma hakkı</a></li>
            <li><a href="#">Çerez Politikası</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="footer-bottom-content">
          <p>{{ footerNote || `© 2024 ${companyName}. Tüm hakları saklıdır.` }}</p>
          <p>Kayıtlı: İstanbul Ticaret Sicil No: 12345</p>
        </div>
      </div>
    </footer>
  </div>
  
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
</style>
