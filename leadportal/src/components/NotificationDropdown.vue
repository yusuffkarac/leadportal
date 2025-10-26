<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios.js'

const router = useRouter()
const isOpen = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const isLoading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const hoverTimeout = ref(null)

// Bildirim dropdown açma
function openDropdown() {
  // Eğer kapatma timeout'u varsa iptal et
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
    hoverTimeout.value = null
  }
  
  isOpen.value = true
  if (notifications.value.length === 0) {
    loadNotifications()
  }
}

// Bildirim dropdown kapatma (delay ile)
function closeDropdown() {
  // Kısa bir delay ekle ki mouse dropdown'a geçerken kapanmasın
  hoverTimeout.value = setTimeout(() => {
    isOpen.value = false
    hoverTimeout.value = null
  }, 150)
}


// Bildirimleri yükle
async function loadNotifications() {
  if (isLoading.value) return

  try {
    isLoading.value = true
    const response = await api.get(`/notifications?page=${page.value}&limit=10`)

    if (response.data.success) {
      if (page.value === 1) {
        notifications.value = response.data.notifications
      } else {
        notifications.value.push(...response.data.notifications)
      }
      hasMore.value = response.data.currentPage < response.data.totalPages
    }
  } catch (error) {
    console.error('Bildirimler yüklenirken hata:', error)
  } finally {
    isLoading.value = false
  }
}

// Okunmamış bildirim sayısını yükle
async function loadUnreadCount() {
  try {
    const response = await api.get('/notifications/unread-count')
    if (response.data.success) {
      unreadCount.value = response.data.count
    }
  } catch (error) {
    console.error('Okunmamış bildirim sayısı yüklenirken hata:', error)
  }
}

// Bildirimi okundu olarak işaretle
async function markAsRead(notificationId) {
  try {
    const response = await api.put(`/notifications/${notificationId}/read`)
    if (response.data.success) {
      // Bildirimi güncelle
      const notification = notifications.value.find(n => n.id === notificationId)
      if (notification) {
        notification.isRead = true
        notification.readAt = new Date()
      }
      // Okunmamış sayısını güncelle
      if (unreadCount.value > 0) {
        unreadCount.value--
      }
    }
  } catch (error) {
    console.error('Bildirim okundu olarak işaretlenirken hata:', error)
  }
}

// Tüm bildirimleri okundu olarak işaretle
async function markAllAsRead() {
  try {
    const response = await api.put('/notifications/read-all')
    if (response.data.success) {
      // Tüm bildirimleri güncelle
      notifications.value.forEach(n => {
        n.isRead = true
        n.readAt = new Date()
      })
      unreadCount.value = 0
    }
  } catch (error) {
    console.error('Tüm bildirimler okundu olarak işaretlenirken hata:', error)
  }
}

// Bildirimi sil
async function deleteNotification(notificationId) {
  try {
    const response = await api.delete(`/notifications/${notificationId}`)
    if (response.data.success) {
      // Bildirimi listeden kaldır
      const index = notifications.value.findIndex(n => n.id === notificationId)
      if (index !== -1) {
        const wasUnread = !notifications.value[index].isRead
        notifications.value.splice(index, 1)
        if (wasUnread && unreadCount.value > 0) {
          unreadCount.value--
        }
      }
    }
  } catch (error) {
    console.error('Bildirim silinirken hata:', error)
  }
}

// Bildirime tıklama - ilgili sayfaya git
function handleNotificationClick(notification) {
  // Okunmadıysa okundu olarak işaretle
  if (!notification.isRead) {
    markAsRead(notification.id)
  }

  // Data içinde leadId varsa lead detay sayfasına git
  if (notification.data?.leadId) {
    router.push(`/lead/${notification.data.leadId}`)
    isOpen.value = false
  }
}

// Daha fazla bildirim yükle
function loadMore() {
  page.value++
  loadNotifications()
}

// Göreli zaman formatı
function formatRelativeTime(date) {
  const now = new Date()
  const notifDate = new Date(date)
  const diffMs = now - notifDate
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'Az önce'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} dakika önce`
  } else if (diffHours < 24) {
    return `${diffHours} saat önce`
  } else if (diffDays === 1) {
    return 'Dün'
  } else if (diffDays < 7) {
    return `${diffDays} gün önce`
  } else {
    return notifDate.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: notifDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
}

// Bildirim ikonunu al
function getNotificationIcon(notification) {
  return notification.notificationType?.icon || 'mdi:bell'
}

// Bildirim kategorisine göre renk
function getCategoryColor(category) {
  const colors = {
    'BID': '#667eea',
    'LEAD': '#10b981',
    'PAYMENT': '#f59e0b',
    'ADMIN': '#ef4444'
  }
  return colors[category] || '#6b7280'
}

// Polling için interval
let pollingInterval = null

onMounted(() => {
  loadUnreadCount()

  // Her 30 saniyede bir okunmamış bildirim sayısını kontrol et
  pollingInterval = setInterval(() => {
    loadUnreadCount()
  }, 30000)
})

onUnmounted(() => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
  }
})
</script>

<template>
  <div class="notification-dropdown">
    <button
      class="notification-button"
      @mouseenter="openDropdown"
      @mouseleave="closeDropdown"
      :aria-label="`${unreadCount} okunmamış bildirim`"
    >
      <Icon icon="mdi:bell-outline" width="20" height="20" />
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <transition name="dropdown">
      <div v-if="isOpen" class="dropdown-menu" @mouseenter="openDropdown" @mouseleave="closeDropdown">
        <div class="dropdown-header">
          <h3>Bildirimler</h3>
          <button
            v-if="notifications.length > 0 && unreadCount > 0"
            @click="markAllAsRead"
            class="mark-all-read"
          >
            Tümünü okundu işaretle
          </button>
        </div>

        <div class="notifications-list">
          <div v-if="isLoading && notifications.length === 0" class="loading">
            <div class="spinner-small"></div>
            <span>Yükleniyor...</span>
          </div>

          <div v-else-if="notifications.length === 0" class="empty-state">
            <Icon icon="mdi:bell-off-outline" width="48" height="48" />
            <p>Henüz bildiriminiz yok</p>
          </div>

          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-item"
            :class="{ unread: !notification.isRead }"
            @click="handleNotificationClick(notification)"
          >
            <div class="notification-icon" :style="{ backgroundColor: getCategoryColor(notification.notificationType.category) + '20', color: getCategoryColor(notification.notificationType.category) }">
              <Icon :icon="getNotificationIcon(notification)" width="24" height="24" />
            </div>

            <div class="notification-content">
              <div class="notification-header">
                <h4>{{ notification.title }}</h4>
                <button
                  @click.stop="deleteNotification(notification.id)"
                  class="delete-btn"
                  aria-label="Bildirimi sil"
                >
                  <Icon icon="mdi:close" width="16" height="16" />
                </button>
              </div>
              <p>{{ notification.message }}</p>
              <span class="notification-time">{{ formatRelativeTime(notification.createdAt) }}</span>
            </div>

            <div v-if="!notification.isRead" class="unread-indicator"></div>
          </div>

          <button
            v-if="hasMore && !isLoading"
            @click="loadMore"
            class="load-more"
          >
            Daha fazla yükle
          </button>

          <div v-if="isLoading && notifications.length > 0" class="loading-more">
            <div class="spinner-small"></div>
          </div>
        </div>

        <div class="dropdown-footer">
          <router-link to="/profile/notifications" @click="isOpen = false">
            Bildirim Ayarları
          </router-link>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.notification-dropdown {
  position: relative;
}

.notification-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #4b5563;
  transition: all 0.2s;
}

.notification-button:hover {
  background: #f3f4f6;
  color: #667eea;
}

.badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #ef4444;
  color: white;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 400px;
  max-width: 90vw;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.dropdown-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.mark-all-read {
  padding: 6px 12px;
  background: transparent;
  border: none;
  color: #667eea;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}

.mark-all-read:hover {
  background: #f3f4f6;
}

.notifications-list {
  max-height: 500px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
  border-bottom: 1px solid #f3f4f6;
}

.notification-item:hover {
  background: #f9fafb;
}

.notification-item.unread {
  background: #f0f4ff;
}

.notification-item.unread:hover {
  background: #e5edff;
}

.notification-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  align-self: center;
}

.notification-icon :deep(svg) {
  opacity: 1;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

.notification-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
}

.notification-content p {
  margin: 0 0 6px 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notification-time {
  font-size: 12px;
  color: #9ca3af;
}

.delete-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.unread-indicator {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background: #667eea;
  border-radius: 50%;
}

.loading,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
  color: #9ca3af;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.load-more {
  width: 100%;
  padding: 12px;
  border: none;
  background: transparent;
  color: #667eea;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.load-more:hover {
  background: #f3f4f6;
}

.loading-more {
  display: flex;
  justify-content: center;
  padding: 12px;
}

.dropdown-footer {
  padding: 12px 20px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

.dropdown-footer a {
  color: #667eea;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

.dropdown-footer a:hover {
  text-decoration: underline;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dropdown animasyonu */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Mobil responsive */
@media (max-width: 640px) {
  .dropdown-menu {
    position: fixed;
    top: 60px;
    right: 10px;
    left: 10px;
    width: auto;
    max-height: calc(100vh - 80px);
  }

  .notifications-list {
    max-height: calc(100vh - 200px);
  }
}
</style>
