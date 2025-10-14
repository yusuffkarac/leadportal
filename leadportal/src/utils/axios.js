import axios from 'axios'

// Axios instance oluştur
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000
})

// Request interceptor - token ekle
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - bakım modu kontrolü
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Bakım modu kontrolü
    if (error.response?.status === 503 && error.response?.data?.maintenance) {
      showMaintenanceModal(error.response.data.message)
      return Promise.reject(error)
    }
    
    // 401 Unauthorized - token süresi dolmuş
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      localStorage.removeItem('userType')
      sessionStorage.removeItem('userType')
      localStorage.removeItem('userTypeId')
      sessionStorage.removeItem('userTypeId')
      window.dispatchEvent(new Event('auth-change'))
      
      // Login sayfasına yönlendir (eğer zaten login sayfasında değilse)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// Bakım modu modal'ını göster
function showMaintenanceModal(message) {
  // Eğer zaten bir modal varsa, yeni modal oluşturma
  if (document.getElementById('maintenance-modal')) {
    return
  }
  
  const modal = document.createElement('div')
  modal.id = 'maintenance-modal'
  modal.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      backdrop-filter: blur(4px);
    ">
      <div style="
        background: white;
        border-radius: 16px;
        padding: 48px;
        text-align: center;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      ">
        <div style="
          color: #f59e0b;
          margin-bottom: 24px;
          display: flex;
          justify-content: center;
        ">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 style="
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 16px;
        ">Sistem Bakımda</h1>
        <p style="
          font-size: 16px;
          color: var(--primary);
          line-height: 1.6;
          margin-bottom: 32px;
        ">${message || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.'}</p>
        <button onclick="window.location.reload()" style="
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--text);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          margin: 0 auto;
          transition: background-color 0.2s ease;
        " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='var(--#3b82f6)'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
          Sayfayı Yenile
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Modal'ı kapatmayı engelle
  modal.addEventListener('click', (e) => {
    e.stopPropagation()
  })
  
  // ESC tuşu ile kapatmayı engelle
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
    }
  })
}

export default api
