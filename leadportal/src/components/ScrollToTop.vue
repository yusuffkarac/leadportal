<template>
  <button
    v-if="showButton"
    class="scroll-to-top"
    @click="scrollToTop"
    aria-label="Yukarı çık"
  >
    <Icon icon="mdi:chevron-up" width="24" height="24" />
  </button>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const showButton = ref(false)

function handleScroll() {
  showButton.value = window.scrollY > 300
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll() // İlk yüklemede kontrol et
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.scroll-to-top {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 999;
  transition: all 0.3s ease;
  color: #374151;
}

.scroll-to-top:hover {
  background: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  color: #1f2937;
}

.scroll-to-top:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .scroll-to-top {
    width: 40px;
    height: 40px;
    bottom: 3%;
    right: 3%;
  }
}
</style>
