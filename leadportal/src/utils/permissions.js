// Yetkilendirme kontrolü için utility fonksiyonları

// Kullanıcının belirli bir sayfaya erişim yetkisi var mı kontrol et
export async function checkPageAccess(pagePath) {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const userType = localStorage.getItem('userType') || sessionStorage.getItem('userType')
    
    if (!token || !userType || userType === 'ADMIN') {
      return true // Admin'ler her yere erişebilir
    }

    const response = await fetch(`/api/user-types/check/${userType}${pagePath}`, {
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
  const role = localStorage.getItem('role') || sessionStorage.getItem('role')
  return role === 'ADMIN'
}

// Kullanıcının giriş yapıp yapmadığını kontrol et
export function isAuthenticated() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return !!token
}

// Kullanıcı tipini al
export function getUserType() {
  return localStorage.getItem('userType') || sessionStorage.getItem('userType')
}
