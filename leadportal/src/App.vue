<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
import { ref, onMounted, onUnmounted } from 'vue'

const router = useRouter()

function logout() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('token')
      window.localStorage.removeItem('role')
      window.sessionStorage.removeItem('token')
      window.sessionStorage.removeItem('role')
      window.dispatchEvent(new Event('auth-change'))
      router.push('/login')
    }
  } catch (e) {
    // ignore
  }
}

const isAuthed = ref(false)
const role = ref(null)

function updateAuth() {
  if (typeof window === 'undefined') return
  const storage = window.sessionStorage.getItem('token') ? window.sessionStorage : window.localStorage
  isAuthed.value = !!storage.getItem('token')
  role.value = storage.getItem('role') || null
}

function onAuthChange() { updateAuth() }

let navToken = 0
let hideTimer = null

onMounted(() => {
  updateAuth()
  window.addEventListener('auth-change', onAuthChange)
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
})

const isNavigating = ref(false)
const isMobileMenuOpen = ref(false)

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}
</script>

<template>
  <div class="container">
    <div class="navbar">
      <div class="brand">
        <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="40" height="40" />
        <span>LeadPortal</span>
      </div>
      
      <!-- Desktop Navigation -->
      <div class="nav-links desktop-nav">
        <RouterLink to="/">Anasayfa</RouterLink>
        <RouterLink to="/about">Hakkında</RouterLink>
        <RouterLink v-if="!isAuthed" to="/login">Giriş</RouterLink>
        <RouterLink v-if="isAuthed && role === 'ADMIN'" to="/admin/leads">Admin</RouterLink>
        <RouterLink v-if="isAuthed && role === 'ADMIN'" to="/admin/users/new">Kullanıcı Ekle</RouterLink>
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
        <RouterLink to="/" @click="closeMobileMenu" class="mobile-nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          <span>Anasayfa</span>
        </RouterLink>
        
        <RouterLink to="/about" @click="closeMobileMenu" class="mobile-nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Hakkında</span>
        </RouterLink>
        
        <RouterLink v-if="!isAuthed" to="/login" @click="closeMobileMenu" class="mobile-nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10,17 15,12 10,7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          <span>Giriş</span>
        </RouterLink>
        
        <RouterLink v-if="isAuthed && role === 'ADMIN'" to="/admin/leads" @click="closeMobileMenu" class="mobile-nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>Admin</span>
        </RouterLink>
        
        <RouterLink v-if="isAuthed && role === 'ADMIN'" to="/admin/users/new" @click="closeMobileMenu" class="mobile-nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          <span>Kullanıcı Ekle</span>
        </RouterLink>
        
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
              <span>LeadPortal</span>
            </div>
            <p class="footer-description">
              Almanya'nın önde gelen lead pazar yeri. Profesyonel açık artırmalar ve lead yönetimi platformu.
            </p>
            <div class="footer-contact">
              <div class="contact-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span>+90 (212) 123 45 67</span>
              </div>
              <div class="contact-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>info@leadportal.com</span>
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
          <p>© 2024 LeadPortal. Tüm hakları saklıdır.</p>
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
</style>
