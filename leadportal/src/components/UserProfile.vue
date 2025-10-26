<template>
  <div class="user-profile-container" @mouseenter="openDropdown" @mouseleave="closeDropdown">
    <div class="user-profile">
      <div class="profile-info">
        <div class="profile-image">
          <img 
            v-if="user?.profileImage" 
            :src="user.profileImage" 
            :alt="displayName"
            class="profile-img"
          />
          <div v-else class="profile-placeholder">
            {{ initials }}
          </div>
        </div>
        <div class="profile-details">
          <div class="profile-name">{{ displayName }}</div>
          <div class="profile-role">{{ roleDisplay }}</div>
        </div>
      </div>
      <div class="profile-arrow" :class="{ 'rotated': isDropdownOpen }">
        <Icon icon="mdi:chevron-down" width="16" height="16" />
      </div>
    </div>
    
    <!-- Dropdown Menu -->
    <div v-if="isDropdownOpen" class="profile-dropdown">
      <div class="dropdown-item" @click="goToProfile">
        <Icon icon="mdi:account" width="16" height="16" />
        <span>Profil</span>
      </div>
      <div class="dropdown-item logout" @click="logout">
        <Icon icon="mdi:logout" width="16" height="16" />
        <span>Çıkış Yap</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAlert } from '../composables/useAlert'
import { Icon } from '@iconify/vue'

const props = defineProps({
  user: {
    type: Object,
    default: () => ({})
  },
  role: {
    type: String,
    default: ''
  },
  userType: {
    type: Object,
    default: () => ({})
  }
})

const router = useRouter()
const isDropdownOpen = ref(false)
const { success } = useAlert()

const displayName = computed(() => {
  if (props.user?.firstName && props.user?.lastName) {
    return `${props.user.firstName} ${props.user.lastName}`
  }
  if (props.user?.firstName) {
    return props.user.firstName
  }
  if (props.user?.username) {
    return props.user.username
  }
  return props.user?.email || 'Kullanıcı'
})

const initials = computed(() => {
  const name = displayName.value
  const words = name.split(' ')
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name[0]?.toUpperCase() || 'U'
})

const roleDisplay = computed(() => {
  if (props.userType?.name) {
    return props.userType.name
  }
  if (props.role === 'ADMIN' || props.role === 'SUPERADMIN') {
    return 'Admin'
  }
  return 'Kullanıcı'
})

function openDropdown() {
  isDropdownOpen.value = true
}

function closeDropdown() {
  isDropdownOpen.value = false
}

function goToProfile() {
  router.push('/profile')
}

function logout() {
  // Çıkış işlemi için parent component'e event gönder
  window.dispatchEvent(new CustomEvent('user-logout'))
  // Success alert göster
  success('Başarıyla çıkış yapıldı')
}
</script>

<style scoped>
.user-profile-container {
  position: relative;
  display: inline-block;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
  min-width: 200px;
}

.user-profile-container:hover .user-profile {
  border-radius: 12px 12px 0 0;
  border-bottom: none;
}

.user-profile:hover {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.profile-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.profile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.profile-details {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-role {
  font-size: 12px;
  color: #6b7280;
  background: #ffffff;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
  font-weight: 500;
  border: 1px solid #e5e7eb;
}

.profile-arrow {
  color: #9ca3af;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.profile-arrow.rotated {
  transform: rotate(180deg);
}

.user-profile:hover .profile-arrow {
  transform: translateY(1px);
}

.user-profile:hover .profile-arrow.rotated {
  transform: rotate(180deg) translateY(1px);
}

/* Dropdown Menu */
.profile-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 50;
  overflow: hidden;
  margin-top: 0;
  animation: dropdownFadeIn 0.2s ease-out;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #f8fafc;
  color: #1f2937;
}

.dropdown-item.logout:hover {
  background: #fef2f2;
  color: #dc2626;
}

.dropdown-item svg {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.dropdown-item:hover svg {
  transform: scale(1.1);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .user-profile {
    min-width: 160px;
    padding: 6px 10px;
  }
  
  .profile-image {
    width: 32px;
    height: 32px;
  }
  
  .profile-name {
    font-size: 13px;
  }
  
  .profile-role {
    font-size: 11px;
    padding: 1px 6px;
  }
  
  .profile-arrow svg {
    width: 14px;
    height: 14px;
  }
}
</style>
