<template>
  <div class="custom-page-view">
    <div class="page-content">
      <div v-if="loading" class="loading-section">
        <div class="loading-spinner"></div>
        <p>Seite wird geladen...</p>
      </div>
      
      <div v-else-if="error" class="error-section">
        <Icon icon="mdi:alert-circle" width="64" height="64" />
        <h2>Seite nicht gefunden</h2>
        <p>{{ error }}</p>
        <router-link to="/" class="btn btn-primary">Zur Startseite</router-link>
      </div>
      
      <div v-else-if="page" class="page-content-wrapper">
        <div class="page-header">
          <h1>{{ page.title }}</h1>
        </div>
        
        <div v-if="page.images && page.images.length > 0" class="page-images">
          <div
            v-for="(image, index) in page.images"
            :key="index"
            class="page-image-item"
          >
            <img :src="image" :alt="`${page.title} - Bild ${index + 1}`" />
          </div>
        </div>
        
        <div
          v-if="page.content"
          class="page-content-html"
          v-html="page.content"
        ></div>
        
        <div v-else class="no-content">
          <p>Auf dieser Seite ist noch kein Inhalt verfügbar.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from '@/utils/axios'
import { Icon } from '@iconify/vue'

const route = useRoute()
const router = useRouter()
const page = ref(null)
const loading = ref(true)
const error = ref(null)

async function loadPage() {
  try {
    loading.value = true
    error.value = null
    
    const slug = route.params.slug
    const response = await axios.get(`custom-pages/${slug}`)
    page.value = response.data
  } catch (err) {
    console.error('Seite konnte nicht geladen werden:', err)
    if (err.response?.status === 404) {
      // 404 durumunda forbidden sayfasına yönlendir
      router.replace({ name: 'forbidden' })
    } else {
      error.value = 'Beim Laden der Seite ist ein Fehler aufgetreten.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPage()
})
</script>

<style scoped>
.custom-page-view {
  min-height: 100vh;
  background: var(--bg, #f8fafc);
  width: 100%;
}

.page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 24px;
}

.loading-section,
.error-section {
  text-align: center;
  padding: 64px 32px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 24px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 16px 0 8px;
}

.error-section p {
  color: #6b7280;
  margin-bottom: 24px;
}

.page-content-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 48px;
}

.page-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  line-height: 1.2;
}

.page-images {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.page-image-item {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-image-item img {
  width: 100%;
  height: auto;
  display: block;
}

.page-content-html {
  line-height: 1.8;
  color: #374151;
  font-size: 1rem;
}

.page-content-html :deep(h1),
.page-content-html :deep(h2),
.page-content-html :deep(h3),
.page-content-html :deep(h4),
.page-content-html :deep(h5),
.page-content-html :deep(h6) {
  color: #1f2937;
  font-weight: 700;
  margin-top: 32px;
  margin-bottom: 16px;
}

.page-content-html :deep(h1) {
  font-size: 2rem;
}

.page-content-html :deep(h2) {
  font-size: 1.75rem;
}

.page-content-html :deep(h3) {
  font-size: 1.5rem;
}

.page-content-html :deep(p) {
  margin-bottom: 16px;
}

.page-content-html :deep(ul),
.page-content-html :deep(ol) {
  margin-bottom: 16px;
  padding-left: 24px;
}

.page-content-html :deep(li) {
  margin-bottom: 8px;
}

.page-content-html :deep(a) {
  color: #3b82f6;
  text-decoration: underline;
}

.page-content-html :deep(a:hover) {
  color: #2563eb;
}

.page-content-html :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 24px 0;
}

.page-content-html :deep(blockquote) {
  border-left: 4px solid #3b82f6;
  padding-left: 16px;
  margin: 24px 0;
  color: #6b7280;
  font-style: italic;
}

.no-content {
  text-align: center;
  padding: 48px;
  color: #6b7280;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s;
}

.btn:hover {
  background: #2563eb;
}

@media (max-width: 768px) {
  .page-content {
    padding: 24px 16px;
  }
  
  .page-content-wrapper {
    padding: 24px;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .page-images {
    grid-template-columns: 1fr;
  }
}
</style>

