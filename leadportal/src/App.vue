<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
import UserProfile from './components/UserProfile.vue'
import GlobalAlert from './components/GlobalAlert.vue'
import NotificationDropdown from './components/NotificationDropdown.vue'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { checkPageAccess } from './utils/permissions.js'
import defaultLogo from '@/assets/images/logo.png'
import api from '@/utils/axios.js'
import { Icon } from '@iconify/vue'

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
        <RouterLink to="/">
          <Icon icon="mdi:home-outline" width="16" height="16" />
          <span>Anasayfa</span>
        </RouterLink>
        <RouterLink to="/leads">
          <Icon icon="mdi:briefcase-outline" width="16" height="16" />
          <span>Leadler</span>
        </RouterLink>
        <RouterLink v-if="isAuthed" to="/dashboard">
          <Icon icon="mdi:view-dashboard-outline" width="16" height="16" />
          <span>Dashboard</span>
        </RouterLink>
        <RouterLink v-if="!isAuthed" to="/login">
          <Icon icon="mdi:login-variant" width="16" height="16" />
          <span>Giriş</span>
        </RouterLink>
        
        <!-- Admin Dropdown -->
        <div v-if="isAuthed && (userTypeId === 'ADMIN' || userTypeId === 'SUPERADMIN')" class="admin-dropdown" @mouseenter="openAdminDropdown" @mouseleave="closeAdminDropdown">
          <button class="admin-trigger">
          <Icon icon="mdi:account" width="16" height="16" />
            Admin
            <Icon icon="mdi:chevron-down" width="12" height="12" />
          </button>
          <div v-if="isAdminDropdownOpen" class="admin-dropdown-menu">
            <!-- Yönetim Kategorisi -->
            <div class="menu-category">
              <div class="category-header">
                <Icon icon="mdi:view-dashboard-outline" width="14" height="14" />
                <span>Yönetim</span>
              </div>
              <RouterLink to="/admin/leads" class="menu-item">
                <Icon icon="mdi:briefcase-outline" width="16" height="16" />
                Leadler
              </RouterLink>
              <RouterLink to="/admin/users" class="menu-item">
                <Icon icon="mdi:account-group-outline" width="16" height="16" />
                Kullanıcılar
              </RouterLink>
              <RouterLink to="/admin/statistics" class="menu-item">
                <Icon icon="mdi:chart-line-variant" width="16" height="16" />
                İstatistikler
              </RouterLink>
              <RouterLink to="/admin/activity-log" class="menu-item">
                <Icon icon="mdi:history" width="16" height="16" />
                Aktivite Geçmişi
              </RouterLink>
              <RouterLink to="/admin/balance" class="menu-item">
                <Icon icon="mdi:wallet-outline" width="16" height="16" />
                Bakiye Yönetimi
              </RouterLink>
            </div>

            <!-- Ayarlar Kategorisi -->
            <div class="menu-category">
              <div class="category-header">
                <Icon icon="mdi:cog-outline" width="14" height="14" />
                <span>Ayarlar</span>
              </div>
              <RouterLink to="/admin/settings" class="menu-item">
                <Icon icon="mdi:cog-outline" width="16" height="16" />
                Ayarlar
              </RouterLink>
              <RouterLink to="/admin/email-sms-settings" class="menu-item">
                <Icon icon="mdi:email-outline" width="16" height="16" />
                Mail/SMS Ayarları
              </RouterLink>
              <RouterLink to="/admin/notification-settings" class="menu-item">
                <Icon icon="mdi:bell-outline" width="16" height="16" />
                Bildirim Ayarları
              </RouterLink>
            </div>

            <!-- Yetkiler Kategorisi -->
            <div class="menu-category">
              <div class="category-header">
                <Icon icon="mdi:shield-outline" width="14" height="14" />
                <span>Yetkiler</span>
              </div>
              <RouterLink to="/admin/user-types" class="menu-item">
                <Icon icon="mdi:account-multiple-outline" width="16" height="16" />
                Kullanıcı Tipleri
              </RouterLink>
              <RouterLink to="/admin/lead-type-permissions" class="menu-item">
                <Icon icon="mdi:shield-check-outline" width="16" height="16" />
                Lead Tipi Yetkileri
              </RouterLink>
            </div>

            <!-- İçerik Yönetimi Kategorisi -->
            <div class="menu-category">
              <div class="category-header">
                <Icon icon="mdi:file-document-outline" width="14" height="14" />
                <span>İçerik Yönetimi</span>
              </div>
              <RouterLink to="/admin/faq" class="menu-item">
                <Icon icon="mdi:help-circle-outline" width="16" height="16" />
                FAQ Yönetimi
              </RouterLink>
              <RouterLink to="/admin/about" class="menu-item">
                <Icon icon="mdi:information-outline" width="16" height="16" />
                Hakkında Yönetimi
              </RouterLink>
              <RouterLink to="/admin/homepage-settings" class="menu-item">
                <Icon icon="mdi:home-outline" width="16" height="16" />
                Ana Sayfa Yönetimi
              </RouterLink>
            </div>
          </div>
        </div>
        <NotificationDropdown v-if="isAuthed" />
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

      <!-- Mobile Menu Button -->
      <button class="mobile-menu-btn" @click="toggleMobileMenu">
        <Icon v-if="!isMobileMenuOpen" icon="mdi:menu" width="24" height="24" />
        <Icon v-else icon="mdi:close" width="24" height="24" />
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
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        
        <RouterLink to="/" @click="closeMobileMenu" class="mobile-nav-link">
          <Icon icon="mdi:home-outline" width="20" height="20" />
          <span>Anasayfa</span>
        </RouterLink>

        <RouterLink to="/leads" @click="closeMobileMenu" class="mobile-nav-link">
          <Icon icon="mdi:briefcase-outline" width="20" height="20" />
          <span>Leadler</span>
        </RouterLink>
        
        
        <RouterLink v-if="isAuthed" to="/dashboard" @click="closeMobileMenu" class="mobile-nav-link">
          <Icon icon="mdi:view-dashboard-outline" width="20" height="20" />
          <span>Dashboard</span>
        </RouterLink>
        
        
        <RouterLink v-if="!isAuthed" to="/login" @click="closeMobileMenu" class="mobile-nav-link">
          <Icon icon="mdi:login-variant" width="20" height="20" />
          <span>Giriş</span>
        </RouterLink>
        
        <!-- Admin Section -->
        <div v-if="isAuthed && (userTypeId === 'ADMIN' || userTypeId === 'SUPERADMIN')" class="mobile-admin-section">
          <!-- Yönetim Kategorisi -->
          <div class="mobile-category-label">
            <Icon icon="mdi:view-dashboard-outline" width="16" height="16" />
            Yönetim
          </div>

          <RouterLink to="/admin/leads" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:briefcase-outline" width="20" height="20" />
            <span>Leadler</span>
          </RouterLink>

          <RouterLink to="/admin/users" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:account-group-outline" width="20" height="20" />
            <span>Kullanıcılar</span>
          </RouterLink>

          <RouterLink to="/admin/statistics" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:chart-line-variant" width="20" height="20" />
            <span>İstatistikler</span>
          </RouterLink>

          <RouterLink to="/admin/activity-log" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:history" width="20" height="20" />
            <span>Aktivite Geçmişi</span>
          </RouterLink>

          <RouterLink to="/admin/balance" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:wallet-outline" width="20" height="20" />
            <span>Bakiye Yönetimi</span>
          </RouterLink>

          <!-- Ayarlar Kategorisi -->
          <div class="mobile-category-label">
            <Icon icon="mdi:cog-outline" width="16" height="16" />
            Ayarlar
          </div>

          <RouterLink to="/admin/settings" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:cog-outline" width="20" height="20" />
            <span>Ayarlar</span>
          </RouterLink>


          <RouterLink to="/admin/email-sms-settings" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:email-outline" width="20" height="20" />
            <span>Mail/SMS Ayarları</span>
          </RouterLink>

          <RouterLink to="/admin/notification-settings" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:bell-outline" width="20" height="20" />
            <span>Bildirim Ayarları</span>
          </RouterLink>

          <!-- Yetkiler Kategorisi -->
          <div class="mobile-category-label">
            <Icon icon="mdi:shield-outline" width="16" height="16" />
            Yetkiler
          </div>

          <RouterLink to="/admin/user-types" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:account-multiple-outline" width="20" height="20" />
            <span>Kullanıcı Tipleri</span>
          </RouterLink>

          <RouterLink to="/admin/lead-type-permissions" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:shield-check-outline" width="20" height="20" />
            <span>Lead Tipi Yetkileri</span>
          </RouterLink>

          <!-- İçerik Yönetimi Kategorisi -->
          <div class="mobile-category-label">
            <Icon icon="mdi:file-document-outline" width="16" height="16" />
            İçerik Yönetimi
          </div>

          <RouterLink to="/admin/faq" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:help-circle-outline" width="20" height="20" />
            <span>FAQ Yönetimi</span>
          </RouterLink>

          <RouterLink to="/admin/about" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:information-outline" width="20" height="20" />
            <span>Hakkında Yönetimi</span>
          </RouterLink>

          <RouterLink to="/admin/homepage-settings" @click="closeMobileMenu" class="mobile-nav-link">
            <Icon icon="mdi:home-outline" width="20" height="20" />
            <span>Ana Sayfa Yönetimi</span>
          </RouterLink>
        </div>
        
        <div v-if="isAuthed" class="mobile-user-section">
          <UserProfile 
            :user="currentUser" 
            :role="role" 
            :userType="userType"
            :canAccessAbout="canAccessAbout"
            :canAccessFAQ="canAccessFAQ"
            :canAccessPurchased="canAccessPurchased"
          />
          <button class="mobile-logout-btn" @click="logout">
            <Icon icon="mdi:logout-variant" width="20" height="20" />
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
  min-width: 15rem;
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

/* Menu Categories */
.menu-category {
  padding: 0.5rem 0;
}

.menu-category:not(:last-child) {
  border-bottom: 1px solid #e2e8f0;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #f9fafb;
}

.category-header svg {
  flex-shrink: 0;
  opacity: 0.7;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem 0.625rem 2.25rem;
  color: #374151;
  text-decoration: none;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.menu-item:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #1f2937;
  box-shadow: inset 3px 0px 0px var(--text);
}

.menu-item svg {
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.menu-item:hover svg {
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
