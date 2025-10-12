// Yetkilendirme kontrolü için utility fonksiyonları

// Kullanıcının belirli bir sayfaya erişim yetkisi var mı kontrol et
export async function checkPageAccess(pagePath) {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const userTypeId = localStorage.getItem('userTypeId') || sessionStorage.getItem('userTypeId')
    
    if (!token || !userTypeId || userTypeId === 'ADMIN' || userTypeId === 'SUPERADMIN') {
      return true // Admin'ler her yere erişebilir
    }

    // API'ye route parametresi olarak gönder
    const route = pagePath.startsWith('/') ? pagePath.slice(1) : pagePath
    const response = await fetch(`/api/user-types/check/${userTypeId}?route=${encodeURIComponent(route)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.hasAccess
    }
    
    return false
  } catch (error) {
    console.error('Permission check error:', error)
    return false
  }
}

// Kullanıcının admin olup olmadığını kontrol et
export function isAdmin() {
  const userTypeId = localStorage.getItem('userTypeId') || sessionStorage.getItem('userTypeId')
  return userTypeId === 'ADMIN' || userTypeId === 'SUPERADMIN'
}

// Kullanıcının giriş yapıp yapmadığını kontrol et
export function isAuthenticated() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return !!token
}

// Kullanıcı tipini al
export function getUserType() {
  const userTypeStr = localStorage.getItem('userType') || sessionStorage.getItem('userType')
  try {
    return userTypeStr ? JSON.parse(userTypeStr) : null
  } catch (e) {
    return null
  }
}

// Kullanıcı tipi ID'sini al
export function getUserTypeId() {
  return localStorage.getItem('userTypeId') || sessionStorage.getItem('userTypeId')
}
